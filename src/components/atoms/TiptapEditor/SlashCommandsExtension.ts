import { Extension } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import Suggestion, { type SuggestionOptions, type SuggestionProps } from '@tiptap/suggestion';
import tippy from 'tippy.js';
import type { Instance } from 'tippy.js';
import {
    getSuggestionItems,
    SlashCommandsList,
    type SlashCommandItem,
    type SlashCommandsListProps,
    type SlashCommandsListRef,
} from './SlashCommandsList';

interface SlashCommandsExtensionOptions {
    suggestion: Omit<SuggestionOptions<SlashCommandItem, SlashCommandItem>, 'editor'>;
}

const toListProps = (
    props: SuggestionProps<SlashCommandItem, SlashCommandItem>,
): SlashCommandsListProps => ({
    command: props.command,
    items: props.items,
});

export const SlashCommandsExtension = Extension.create<SlashCommandsExtensionOptions>({
    name: 'slash-commands',

    addOptions() {
        return {
            suggestion: {
                char: '/',
                command: ({ editor, range, props }: {
                    editor: import('@tiptap/core').Editor;
                    range: import('@tiptap/core').Range;
                    props: SlashCommandItem;
                }) => {
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
                    let component: ReactRenderer<SlashCommandsListRef, SlashCommandsListProps> | null = null;
                    let popup: Instance[] = [];

                    return {
                        onStart: (props: SuggestionProps<SlashCommandItem, SlashCommandItem>) => {
                            component = new ReactRenderer<SlashCommandsListRef, SlashCommandsListProps>(SlashCommandsList, {
                                props: toListProps(props),
                                editor: props.editor,
                            });

                            if (!props.clientRect) {
                                return;
                            }
                            const getReferenceClientRect = (): DOMRect => props.clientRect?.() ?? new DOMRect();

                            popup = tippy('body', {
                                getReferenceClientRect,
                                appendTo: () => document.body,
                                content: component.element,
                                showOnCreate: true,
                                interactive: true,
                                trigger: 'manual',
                                placement: 'bottom-start',
                            });
                        },

                        onUpdate(props: SuggestionProps<SlashCommandItem, SlashCommandItem>) {
                            component?.updateProps(toListProps(props));

                            if (!props.clientRect || !popup[0]) {
                                return;
                            }
                            const getReferenceClientRect = (): DOMRect => props.clientRect?.() ?? new DOMRect();

                            popup[0].setProps({
                                getReferenceClientRect,
                            });
                        },

                        onKeyDown(props) {
                            if (props.event.key === 'Escape') {
                                popup[0]?.hide();
                                return true;
                            }

                            return component?.ref?.onKeyDown(props) ?? false;
                        },

                        onExit() {
                            popup[0]?.destroy();
                            popup = [];
                            component?.destroy();
                            component = null;
                        },
                    };
                },
            }),
        ];
    },
});
