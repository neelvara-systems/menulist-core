// @ts-nocheck
import { Extension } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import Suggestion from '@tiptap/suggestion';
import tippy from 'tippy.js';
import { getSuggestionItems, SlashCommandsList, SlashCommandsListRef } from './SlashCommandsList';

export const SlashCommandsExtension = Extension.create({
    name: 'slash-commands',

    addOptions() {
        return {
            suggestion: {
                char: '/',
                command: ({ editor, range, props }) => {
                    props.command({ editor, range });
                },
            },
        };
    },

    addProseMirrorPlugins() {
        return [
            Suggestion({
                editor: this.editor,
                ...this.options.suggestion,
                items: getSuggestionItems,
                render: () => {
                    let component: ReactRenderer<SlashCommandsListRef>;
                    let popup: any;

                    return {
                        onStart: props => {
                            component = new ReactRenderer(SlashCommandsList, {
                                props,
                                editor: props.editor,
                            });

                            if (!props.clientRect) {
                                return;
                            }

                            popup = tippy('body', {
                                getReferenceClientRect: props.clientRect as any,
                                appendTo: () => document.body,
                                content: component.element,
                                showOnCreate: true,
                                interactive: true,
                                trigger: 'manual',
                                placement: 'bottom-start',
                            });
                        },

                        onUpdate(props) {
                            component.updateProps(props);

                            if (!props.clientRect) {
                                return;
                            }

                            popup[0].setProps({
                                getReferenceClientRect: props.clientRect as any,
                            });
                        },

                        onKeyDown(props) {
                            if (props.event.key === 'Escape') {
                                popup[0].hide();
                                return true;
                            }

                            return component.ref?.onKeyDown(props);
                        },

                        onExit() {
                            popup[0].destroy();
                            component.destroy();
                        },
                    };
                },
            }),
        ];
    },
});
