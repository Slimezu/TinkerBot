#!/usr/bin/env python3
import os
import sys
import time
import json
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

URL = "https://huggingface.co/slimezu/Slack/resolve/main/Slack.gguf"
TARGET_SIZE = 1464179680
CHUNK_SIZE = 8 * 1024 * 1024 # 8 MB chunks
OUT_FILE = os.path.abspath("./public/Slack.gguf")
PART_FILE = os.path.abspath("./public/Slack.gguf.part")
NEXT_TO_INDEX = os.path.abspath("./Slack.gguf")
STATUS_FILE = "/tmp/gguf_download_status.json"
PID_FILE = "/tmp/download_gguf.pid"
NUM_WORKERS = 6

lock = threading.Lock()
downloaded_bytes_lock = threading.Lock()
completed_bytes = 0
last_report_time = time.time()
last_report_bytes = 0
current_speed_mb = 0.0

def update_status(status_str, err_msg=None):
    global last_report_time, last_report_bytes, current_speed_mb
    now = time.time()
    dt = now - last_report_time
    if dt >= 1.0:
        db = completed_bytes - last_report_bytes
        current_speed_mb = (db / dt) / (1024 * 1024)
        last_report_time = now
        last_report_bytes = completed_bytes

    pct = round((completed_bytes / TARGET_SIZE) * 100, 1) if TARGET_SIZE > 0 else 0
    rem_bytes = max(0, TARGET_SIZE - completed_bytes)
    eta = round(rem_bytes / (current_speed_mb * 1024 * 1024)) if current_speed_mb > 0.1 else 0

    data = {
        "status": status_str,
        "downloadedBytes": completed_bytes,
        "totalBytes": TARGET_SIZE,
        "percent": min(100.0, pct),
        "speed": f"{current_speed_mb:.2f} MB/s" if current_speed_mb > 0 else "Connecting...",
        "etaSeconds": eta,
        "timestamp": int(now * 1000)
    }
    if err_msg:
        data["error"] = err_msg

    try:
        tmp = STATUS_FILE + ".tmp"
        with open(tmp, "w") as f:
            json.dump(data, f)
        os.replace(tmp, STATUS_FILE)
    except Exception:
        pass

def download_single_chunk(chunk_idx, start_byte, end_byte, part_path):
    global completed_bytes
    expected_len = end_byte - start_byte + 1
    req = urllib.request.Request(
        URL,
        headers={
            "User-Agent": "TinkerBot-GGUF-Downloader/2.0",
            "Range": f"bytes={start_byte}-{end_byte}"
        }
    )

    backoff = 1.5
    for attempt in range(12):
        try:
            with urllib.request.urlopen(req, timeout=25) as resp:
                if resp.status not in (200, 206):
                    raise RuntimeError(f"Unexpected status: {resp.status}")
                
                buf = bytearray()
                while True:
                    chunk = resp.read(64 * 1024)
                    if not chunk:
                        break
                    buf.extend(chunk)
                    with downloaded_bytes_lock:
                        completed_bytes += len(chunk)
                        update_status("downloading")

                if len(buf) != expected_len:
                    with downloaded_bytes_lock:
                        completed_bytes -= len(buf)
                    raise RuntimeError(f"Chunk length mismatch: got {len(buf)}, expected {expected_len}")

                with lock:
                    with open(part_path, "r+b") as f:
                        f.seek(start_byte)
                        f.write(buf)

                return True
        except Exception as e:
            if attempt < 11:
                time.sleep(backoff)
                backoff = min(15, backoff * 1.5)
            else:
                raise e

def main():
    global completed_bytes, last_report_bytes
    pid = os.getpid()
    with open(PID_FILE, "w") as pf:
        pf.write(str(pid))

    print(f"Checking {OUT_FILE} and {NEXT_TO_INDEX}...")
    # If already fully downloaded
    if os.path.exists(OUT_FILE) and os.path.getsize(OUT_FILE) == TARGET_SIZE:
        print(f"Verified Slack.gguf present at {OUT_FILE}.")
        if not os.path.exists(NEXT_TO_INDEX):
            try:
                os.symlink(OUT_FILE, NEXT_TO_INDEX)
            except Exception:
                pass
        completed_bytes = TARGET_SIZE
        update_status("ready")
        return

    os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
    if not os.path.exists(PART_FILE) or os.path.getsize(PART_FILE) != TARGET_SIZE:
        print(f"Allocating part file {PART_FILE}...")
        with open(PART_FILE, "wb") as f:
            f.truncate(TARGET_SIZE)

    num_chunks = (TARGET_SIZE + CHUNK_SIZE - 1) // CHUNK_SIZE
    missing_chunks = []

    # Check which chunks are already downloaded
    with open(PART_FILE, "rb") as f:
        for i in range(num_chunks):
            start = i * CHUNK_SIZE
            end = min(TARGET_SIZE - 1, (i + 1) * CHUNK_SIZE - 1)
            length = end - start + 1
            f.seek(start)
            sample = f.read(min(4096, length))
            # If all zeros, chunk needs to be downloaded
            if set(sample) == {0}:
                missing_chunks.append((i, start, end))

    already_done = (num_chunks - len(missing_chunks)) * CHUNK_SIZE
    completed_bytes = min(TARGET_SIZE, already_done)
    last_report_bytes = completed_bytes
    print(f"Total chunks: {num_chunks}. Already cached: {num_chunks - len(missing_chunks)}. Chunks to download: {len(missing_chunks)}.")
    update_status("downloading")

    if missing_chunks:
        with ThreadPoolExecutor(max_workers=NUM_WORKERS) as executor:
            futures = {
                executor.submit(download_single_chunk, idx, start, end, PART_FILE): idx
                for idx, start, end in missing_chunks
            }
            for future in as_completed(futures):
                idx = futures[future]
                try:
                    future.result()
                except Exception as e:
                    print(f"Chunk {idx} failed: {e}")
                    update_status("error", str(e))
                    return

    # Verify complete file
    if os.path.exists(PART_FILE) and os.path.getsize(PART_FILE) == TARGET_SIZE:
        with open(PART_FILE, "rb") as f:
            magic = f.read(4)
            if magic != b"GGUF":
                raise RuntimeError(f"Header magic is {magic}, expected b'GGUF'")

        os.replace(PART_FILE, OUT_FILE)
        print(f"Renamed {PART_FILE} to {OUT_FILE}.")

        # Create symlink right next to index.html (at root /app/applet/Slack.gguf)
        if os.path.exists(NEXT_TO_INDEX):
            try:
                os.remove(NEXT_TO_INDEX)
            except Exception:
                pass
        try:
            os.symlink(OUT_FILE, NEXT_TO_INDEX)
            print(f"Created symlink right next to index.html at {NEXT_TO_INDEX} -> {OUT_FILE}")
        except Exception as e:
            print(f"Symlink notice: {e}")

        completed_bytes = TARGET_SIZE
        update_status("ready")
        print("Slack.gguf successfully downloaded next to index.html and ready for ultra-fast local WebAssembly inference!")
    else:
        update_status("error", "Size mismatch after download")

if __name__ == "__main__":
    main()
