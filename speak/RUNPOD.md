# PersonaPlex on RunPod — status & resume guide

**Status:** ⏸ Paused — awaiting RunPod credits. Everything else is configured.

## The only blocker
RunPod balance is $0.00 (deploy needs ≥ $0.11). Load credits (RunPod console →
top-right **Load credits**, ~$10) and deploy. Nothing else needs configuring.

## What's already done
- **HuggingFace**: account `oriamasas15`, gated access to
  `nvidia/personaplex-7b-v1` granted. A READ token exists and is set as the pod
  env var `HF_TOKEN` (kept out of this repo — see note below).
- **RunPod pod (configured, not deployed)** at https://console.runpod.io/deploy:
  - GPU: RTX 4090, 24 GB, On-Demand (~$0.69/hr)
  - Template: `runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04`
  - Container disk 40 GB, Volume 20 GB
  - **Expose HTTP port: 8998**
  - **Env var: `HF_TOKEN`** = a HuggingFace READ token

## Resume steps (after credits are loaded)
1. https://console.runpod.io/deploy — RTX 4090 with the overrides above; click
   **Deploy On-Demand**. (If overrides were lost, re-apply: port 8998, HF_TOKEN,
   40 GB disk.)
2. Wait ~1–2 min for the pod to go green → **Connect → Web Terminal**:
   ```bash
   apt-get update && apt-get install -y libopus-dev git
   git clone https://github.com/NVIDIA/personaplex && cd personaplex
   pip install "moshi/."
   python -m moshi.server --host 0.0.0.0 --port 8998
   ```
3. First run downloads the model (several minutes). Wait until it says it's serving.
4. Verify: open **Connect → HTTP Service [8998]** → PersonaPlex UI should load.
5. The endpoint to wire into `speak` (set as `PERSONAPLEX_WS_URL`):
   ```
   wss://<POD_ID>-8998.proxy.runpod.net
   ```

## Notes
- Port **8998** throughout (exposed port + proxy URL).
- The moshi server lives inside the cloned repo at `moshi/`.
- If the HF token was deleted, make a new READ token at
  https://huggingface.co/settings/tokens and update the pod's `HF_TOKEN`.
- Stop/terminate the pod when idle — it bills per second while running.
- **Security:** HF tokens pasted into chat should be rotated; never commit them.
