"use client";

import { useState } from "react";
import {
    LuCheck,
    LuMessageSquare,
    LuRefreshCw,
    LuSparkles,
    LuX,
} from "react-icons/lu";
import type {
    CreativeEditorDesignCueCommand,
    CreativeEditorDesignCuePatchSet,
} from "./types";
import styles from "./CreativeEditor.module.scss";

interface DesignCuePanelProps {
    busy?: boolean;
    commands: CreativeEditorDesignCueCommand[];
    hasTextSelection?: boolean;
    onApply: () => void;
    onCancel: () => void;
    onRunCommand: (commandId: string) => void;
    onRunComment: (comment: string) => void;
    onTryAgain: () => void;
    patchSet?: CreativeEditorDesignCuePatchSet | null;
    selectedLayerName?: string;
}

const findingToneLabel: Record<string, string> = {
    blocked: "Blocked",
    note: "Note",
    ready: "Ready",
    review: "Review",
};

const patchHasDocumentChange = (patchSet?: CreativeEditorDesignCuePatchSet | null) => (
    Boolean(patchSet?.operations.some((operation) => operation.op !== "add_finding"))
);

export default function DesignCuePanel({
    busy = false,
    commands,
    hasTextSelection = false,
    onApply,
    onCancel,
    onRunCommand,
    onRunComment,
    onTryAgain,
    patchSet,
    selectedLayerName,
}: DesignCuePanelProps) {
    const [comment, setComment] = useState("");
    const hasDocumentChange = patchHasDocumentChange(patchSet);

    return (
        <section className={styles.designCuePanel} aria-label="Design Cue">
            <div className={styles.designCueHeader}>
                <LuSparkles size={18} />
                <div>
                    <strong>Design Cue</strong>
                    <span>Ask for a safe edit, review it, then apply.</span>
                </div>
            </div>

            <div className={styles.designCueCommandGrid}>
                {commands.map((command) => {
                    const disabledReason = command.disabled
                        ? command.disabledReason || "Not active"
                        : command.requiresSelection && !hasTextSelection
                            ? "Select text first"
                            : "";
                    return (
                        <button
                            disabled={busy || Boolean(disabledReason)}
                            key={command.id}
                            onClick={() => onRunCommand(command.id)}
                            title={disabledReason || command.ownerHint || command.description}
                            type="button"
                        >
                            <strong>{command.label}</strong>
                            <span>{disabledReason || command.ownerHint || "Ready"}</span>
                        </button>
                    );
                })}
            </div>

            <div className={styles.designCueCommentBox}>
                <label htmlFor="creative-editor-design-cue-comment">
                    {selectedLayerName ? `Comment on ${selectedLayerName}` : "Comment on this design"}
                </label>
                <textarea
                    id="creative-editor-design-cue-comment"
                    maxLength={500}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="Example: make the offer clearer"
                    value={comment}
                />
                <button
                    disabled={busy || !comment.trim()}
                    onClick={() => onRunComment(comment)}
                    type="button"
                >
                    <LuMessageSquare size={15} />
                    Ask Design Cue
                </button>
            </div>

            {patchSet ? (
                <article className={styles.designCueResultCard}>
                    <div className={styles.designCueResultHeader}>
                        <strong>{patchSet.title}</strong>
                        <span>{patchSet.summary}</span>
                    </div>

                    {patchSet.findings?.length ? (
                        <div className={styles.designCueFindingList}>
                            {patchSet.findings.map((finding) => (
                                <div className={styles.designCueFinding} data-tone={finding.tone} key={finding.id}>
                                    <span>{findingToneLabel[finding.tone] || "Note"}</span>
                                    <p>{finding.text}</p>
                                </div>
                            ))}
                        </div>
                    ) : null}

                    <div className={styles.designCueOperationList}>
                        {patchSet.operations.map((operation, index) => (
                            <span key={`${operation.op}-${index}`}>
                                {operation.op === "add_text" ? "Add editable text" : null}
                                {operation.op === "update_text" ? "Update selected text" : null}
                                {operation.op === "update_layer" ? "Update selected layer" : null}
                                {operation.op === "resize_canvas" ? `Resize to ${operation.preset}` : null}
                                {operation.op === "add_finding" ? "Review note" : null}
                            </span>
                        ))}
                    </div>

                    <div className={styles.designCueResultActions}>
                        <button disabled={busy} onClick={onApply} type="button">
                            <LuCheck size={15} />
                            {hasDocumentChange ? "Apply" : "Done"}
                        </button>
                        <button disabled={busy} onClick={onTryAgain} type="button">
                            <LuRefreshCw size={15} />
                            Try another
                        </button>
                        <button disabled={busy} onClick={onCancel} type="button">
                            <LuX size={15} />
                            Cancel
                        </button>
                    </div>
                </article>
            ) : null}
        </section>
    );
}
