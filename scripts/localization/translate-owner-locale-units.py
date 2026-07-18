#!/usr/bin/env python3

import argparse
import json
import os
import re
import tempfile
from pathlib import Path

import torch
import ctranslate2
from IndicTransToolkit.processor import IndicProcessor
from huggingface_hub import snapshot_download
from opencc import OpenCC
from sentencepiece import SentencePieceProcessor
from transformers import (
    AutoModelForSeq2SeqLM,
    AutoTokenizer,
)


INDICTRANS_MODEL = "naklitechie/indictrans2-en-indic-dist-200M"
INDICTRANS_REVISION = "a814dab1ae6e4ee4c7d785b7e1dcb0ac8e36bcd6"
MADLAD400_MODEL = "santhosh/madlad400-3b-ct2"
MADLAD400_REVISION = "c32ad0cf118807ea6258d14be137547155842723"
INDICTRANS_TOKEN_PATTERN = re.compile(r"\{\d+\}")
MADLAD400_TOKEN_PATTERN = re.compile(r"%\d+\$s")


def parse_args():
    parser = argparse.ArgumentParser(
        description="Translate protected MenuList owner-locale units with pinned local models.",
    )
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument(
        "--provider",
        choices=("all", "indictrans2", "madlad400"),
        default="all",
    )
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--beam-size", type=int, default=1)
    return parser.parse_args()


def read_json(path):
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def write_json_atomic(path, value):
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        "w",
        encoding="utf-8",
        dir=target.parent,
        delete=False,
    ) as handle:
        json.dump(value, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
        temporary = handle.name
    os.replace(temporary, target)


def batch(items, size):
    for index in range(0, len(items), size):
        yield items[index:index + size]


def load_or_initialize_results(output_path, payload):
    if Path(output_path).exists():
        results = read_json(output_path)
        if results.get("sourceOwnerSha256") != payload["sourceOwnerSha256"]:
            raise ValueError("Existing result file belongs to a different en-US owner source")
        return results
    return {
        "version": 1,
        "sourceOwnerSha256": payload["sourceOwnerSha256"],
        "providers": payload["providers"],
        "locales": {},
    }


def select_device():
    if torch.backends.mps.is_available():
        return torch.device("mps"), torch.float16
    return torch.device("cpu"), torch.float32


def tokens_match(source, translated, token_pattern):
    return sorted(token_pattern.findall(source)) == sorted(
        token_pattern.findall(translated),
    )


def build_segment_fallback_jobs(source, token_pattern):
    pieces = re.split(f"({token_pattern.pattern})", source)
    jobs = []
    for index, piece in enumerate(pieces):
        if token_pattern.fullmatch(piece):
            continue
        whitespace = re.fullmatch(r"(\s*)(.*?)(\s*)", piece, flags=re.DOTALL)
        leading, core, trailing = whitespace.groups()
        if re.search(r"[A-Za-z]", core):
            jobs.append((index, leading, core, trailing))
    return pieces, jobs


def apply_segment_fallback(
    sources,
    translated,
    token_pattern,
    translate_segments,
):
    broken_indexes = [
        index for index, (source, value) in enumerate(zip(sources, translated))
        if not tokens_match(source, value, token_pattern)
    ]
    if not broken_indexes:
        return translated, 0

    plans = {}
    segment_texts = []
    segment_targets = []
    for source_index in broken_indexes:
        pieces, jobs = build_segment_fallback_jobs(
            sources[source_index],
            token_pattern,
        )
        plans[source_index] = pieces
        for piece_index, leading, core, trailing in jobs:
            segment_targets.append(
                (source_index, piece_index, leading, trailing),
            )
            segment_texts.append(core)

    segment_results = translate_segments(segment_texts)
    for (source_index, piece_index, leading, trailing), value in zip(
        segment_targets,
        segment_results,
    ):
        plans[source_index][piece_index] = f"{leading}{value}{trailing}"

    repaired = list(translated)
    for source_index in broken_indexes:
        repaired[source_index] = "".join(plans[source_index])
        if not tokens_match(
            sources[source_index],
            repaired[source_index],
            token_pattern,
        ):
            raise ValueError(
                "Segment fallback did not preserve protected tokens for "
                f"{sources[source_index]!r}",
            )
    return repaired, len(broken_indexes)


def translate_indic(payload, results, output_path, batch_size, beam_size):
    device, dtype = select_device()
    print(f"Loading pinned IndicTrans2 model on {device}", flush=True)
    tokenizer = AutoTokenizer.from_pretrained(
        INDICTRANS_MODEL,
        revision=INDICTRANS_REVISION,
        trust_remote_code=True,
        local_files_only=True,
    )
    model = AutoModelForSeq2SeqLM.from_pretrained(
        INDICTRANS_MODEL,
        revision=INDICTRANS_REVISION,
        trust_remote_code=True,
        torch_dtype=dtype,
        local_files_only=True,
    ).to(device).eval()
    processor = IndicProcessor(inference=True)

    def translate_texts(texts, target):
        if not texts:
            return []
        prepared = processor.preprocess_batch(
            texts,
            src_lang="eng_Latn",
            tgt_lang=target,
        )
        inputs = tokenizer(
            prepared,
            truncation=True,
            padding="longest",
            return_tensors="pt",
            return_attention_mask=True,
        ).to(device)
        with torch.no_grad():
            generated = model.generate(
                **inputs,
                use_cache=True,
                min_length=0,
                max_length=128,
                num_beams=beam_size,
                num_return_sequences=1,
                no_repeat_ngram_size=3,
                repetition_penalty=1.1,
            )
        decoded = tokenizer.batch_decode(
            generated,
            skip_special_tokens=True,
            clean_up_tokenization_spaces=True,
        )
        return processor.postprocess_batch(
            decoded,
            lang=target,
        )

    for locale, locale_payload in payload["locales"].items():
        if locale_payload["provider"] != "indictrans2":
            continue
        locale_result = results["locales"].setdefault(
            locale,
            {
                "provider": "indictrans2",
                "target": locale_payload["target"],
                "qualityEntries": locale_payload.get("qualityEntries", []),
                "units": {},
            },
        )
        pending = [
            unit for unit in locale_payload["units"]
            if unit["id"] not in locale_result["units"]
        ]
        print(f"{locale}: {len(pending)} IndicTrans2 units pending", flush=True)
        repaired_units = 0
        for unit_batch in batch(pending, batch_size):
            texts = [unit["text"] for unit in unit_batch]
            translated = translate_texts(
                texts,
                locale_payload["target"],
            )
            translated, repaired_count = apply_segment_fallback(
                texts,
                translated,
                INDICTRANS_TOKEN_PATTERN,
                lambda segments: translate_texts(
                    segments,
                    locale_payload["target"],
                ),
            )
            repaired_units += repaired_count
            for unit, value in zip(unit_batch, translated):
                locale_result["units"][unit["id"]] = value
            write_json_atomic(output_path, results)
        if repaired_units:
            print(
                f"{locale}: repaired {repaired_units} token-bearing units "
                "with segmented translation",
                flush=True,
            )

    del model
    del tokenizer
    if device.type == "mps":
        torch.mps.empty_cache()


def translate_madlad400(payload, results, output_path, batch_size, beam_size):
    print("Loading pinned MADLAD-400 CTranslate2 model on cpu", flush=True)
    model_path = snapshot_download(
        MADLAD400_MODEL,
        revision=MADLAD400_REVISION,
        local_files_only=True,
    )
    tokenizer = SentencePieceProcessor()
    tokenizer.load(f"{model_path}/sentencepiece.model")
    model = ctranslate2.Translator(
        model_path,
        device="cpu",
        compute_type="int8",
        inter_threads=6,
        intra_threads=max(1, (os.cpu_count() or 8) // 6),
    )
    traditional_chinese = OpenCC("s2twp")

    def translate_texts(texts, target):
        if not texts:
            return []
        inputs = [
            tokenizer.encode(
                f"<2{target}> {text}",
                out_type=str,
            )
            for text in texts
        ]
        generated = model.translate_batch(
            inputs,
            batch_type="tokens",
            max_batch_size=batch_size,
            beam_size=beam_size,
            no_repeat_ngram_size=3,
            repetition_penalty=1.1,
            max_decoding_length=256,
        )
        return [
            tokenizer.decode(result.hypotheses[0])
            for result in generated
        ]

    for locale, locale_payload in payload["locales"].items():
        if locale_payload["provider"] != "madlad400":
            continue
        locale_result = results["locales"].setdefault(
            locale,
            {
                "provider": "madlad400",
                "target": locale_payload["target"],
                "qualityEntries": locale_payload.get("qualityEntries", []),
                "units": {},
            },
        )
        pending = [
            unit for unit in locale_payload["units"]
            if unit["id"] not in locale_result["units"]
        ]
        print(f"{locale}: {len(pending)} MADLAD-400 units pending", flush=True)
        repaired_units = 0
        for unit_batch in batch(pending, batch_size):
            texts = [unit["text"] for unit in unit_batch]
            translated = translate_texts(
                texts,
                locale_payload["target"],
            )
            translated, repaired_count = apply_segment_fallback(
                texts,
                translated,
                MADLAD400_TOKEN_PATTERN,
                lambda segments: translate_texts(
                    segments,
                    locale_payload["target"],
                ),
            )
            repaired_units += repaired_count
            if locale == "zh-TW":
                translated = [traditional_chinese.convert(value) for value in translated]
            for unit, value in zip(unit_batch, translated):
                locale_result["units"][unit["id"]] = value
            write_json_atomic(output_path, results)
        if repaired_units:
            print(
                f"{locale}: repaired {repaired_units} token-bearing units "
                "with segmented translation",
                flush=True,
            )

    del model
    del tokenizer


def main():
    args = parse_args()
    payload = read_json(args.input)
    if payload.get("version") != 1:
        raise ValueError("Unsupported owner-locale translation payload version")
    results = load_or_initialize_results(args.output, payload)

    if args.provider in ("all", "indictrans2"):
        translate_indic(
            payload,
            results,
            args.output,
            args.batch_size,
            args.beam_size,
        )
    if args.provider in ("all", "madlad400"):
        translate_madlad400(
            payload,
            results,
            args.output,
            args.batch_size,
            args.beam_size,
        )

    write_json_atomic(args.output, results)
    print(f"Translation results written to {args.output}", flush=True)


if __name__ == "__main__":
    main()
