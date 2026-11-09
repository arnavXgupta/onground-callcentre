# 07 · AI calling (AI → real phone)

**Status:** research done; plan to be written after 03
**Brief:** required "where possible" ("show human-to-human and AI-to-human calling")

## Research: how gethelpdeskai does outbound (2026-11-09)

Source: our production Pipecat codebase (`gethelpdeskai`). What carries over:

**Architecture: no websocket server of our own.**
The AI call is one Twilio REST call with inline TwiML pointing at Pipecat Cloud:

```xml
<Response><Connect><Stream url="wss://api.pipecat.daily.co/ws/twilio">
  <Parameter name="_pipecatCloudServiceHost" value="{agent}.{org}"/>
  <Parameter name="lead_name" value="…"/>   <!-- lead context, xml-escaped -->
</Stream></Connect></Response>
```

`client.calls.create({ to, from, twiml })` from a Vercel function. Twilio dials
the phone, and on answer streams 8 kHz μ-law audio to our agent on Pipecat
Cloud. `<Parameter>`s arrive in the bot as `runner_args.call_data["body"]`.

**Bot (Pipecat 1.12, as pinned in production):**
- Entry: `async def bot(runner_args: RunnerArguments)`. Transport via
  `create_transport(runner_args, {"twilio": lambda: FastAPIWebsocketParams(...)})`,
  which builds `TwilioFrameSerializer` from `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN` env.
- Pipeline: Deepgram STT (nova-3) → context aggregator (Silero VAD + smart-turn v3)
  → OpenAI LLM → Cartesia TTS (sonic) → transport out → assistant aggregator.
- 1.12 naming: `PipelineWorker` / `WorkerRunner` (not the old `PipelineTask`).
- Deploy: `Dockerfile` `FROM dailyco/pipecat-base:…-py3.12` + `COPY bot.py`;
  `pcc-deploy.toml` with `agent_name`, `secret_set`, `agent_profile`,
  `[krisp_viva] audio_filter="tel"`, `[scaling] min_agents=1`.

**Pitfalls production hit that a demo will hit too:**
1. Set `audio_in_sample_rate=8000` and `audio_out_sample_rate=8000`. With the
   24k default, audio plays 2–3× fast and drifts.
2. Bot speaks first: queue `TTSSpeakFrame(greeting)` on client connected. No
   `MuteUntilFirstBotComplete` on outbound (it dropped callee audio).
3. Smart-turn on 8 kHz waits about 3 s after a short "No." Use `stop_secs` around 1.0–1.5.
4. Hang-up: `end_call` tool returns `run_llm=False`, then pushes `EndWorkerFrame`
   after the goodbye. Keep a Twilio REST `status=completed` fallback.
5. Silence: re-prompt after about 10 s of idle on outbound.
6. Cold start: `min_agents=1` during the demo, otherwise the callee hears dead air.
7. Voicemail: out of scope. Optionally Twilio `machineDetection`.

**Env:**
- Vercel: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `PCC_SERVICE_HOST`
- Pipecat Cloud secret set: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
  `DEEPGRAM_API_KEY`, `OPENAI_API_KEY`, `CARTESIA_API_KEY`, `CARTESIA_VOICE_ID`

Skip the copied `pipecat-cloud` skill's Twilio outbound snippet: it uses an
older API and is missing `_pipecatCloudServiceHost`. Follow the shape above.
