# Clear Screen Recorder Design

## Goal

Build a standalone Windows desktop recorder optimized for the user's current PC: Windows 10, Intel Core i7-12700F, NVIDIA GeForce RTX 3070 Ti 8 GB, 32 GB RAM, and a 2560 x 1440 display. The first release prioritizes sharp UI and text capture, stable 60 FPS recording, simple operation, and direct editing in Jianying (CapCut China).

## Scope

The first release supports:

- Full-display capture.
- Capture of a selected application window.
- 2560 x 1440 output at 60 FPS.
- System audio capture only.
- H.264 encoding through NVIDIA NVENC.
- Start, pause, resume, and stop controls.
- Keyboard-controlled live focus zoom.
- MP4 output compatible with Jianying.
- Recording health information: elapsed time, file size, and dropped frames.
- Recovery of a usable recording after common interruptions where technically possible.

The first release does not include microphone recording, webcam overlays, annotations, streaming, multi-track recording, cloud upload, or a full video editor.

## Image-Quality Boundary

The physical display contains 2560 x 1440 source pixels. At 100% scale, the recorder preserves a one-to-one pixel relationship between the display and the output frame. No recorder can create genuine source detail when a 1440p image is enlarged inside another 1440p project. Post-production zoom above 100% therefore loses effective resolution regardless of bitrate.

The recorder minimizes avoidable quality loss by capturing the native frame directly, avoiding intermediate resizing, using high-quality hardware encoding, and writing the final editing format once. Live focus zoom makes content easier to follow and avoids an additional Jianying transform, but it enlarges existing screen pixels; it cannot produce detail absent from the source. Truly native-looking high-magnification footage requires a higher-resolution source display or increasing the target application's own UI and font scale before capture.

## Technical Architecture

The application is a standalone C#/.NET 8 WPF desktop program. It is separate from the existing Studio Aruo web application.

### Capture

Windows Graphics Capture provides frames for either a selected display or a selected top-level window. The capture pipeline requests 2560 x 1440 frames at 60 FPS and preserves the captured frame without scaling when zoom is disabled.

For window capture, the program continues to request the selected window's content when it is partially covered, subject to Windows and target-application capture restrictions. Protected or non-capturable windows must be reported clearly rather than producing a silent black recording.

### Video Processing

A dedicated frame-processing stage performs no transformation in normal 1x mode. When focus zoom is active, it crops a region centered near the pointer and scales that region to the output canvas. Camera movement uses bounded smoothing so the frame follows the pointer without abrupt jumps. Initial zoom presets are 1x, 1.5x, and 2x, with optional incremental adjustment.

### Encoding

The primary encoder is NVIDIA NVENC H.264 using the normal High profile and a broadly compatible 4:2:0 pixel format. High 4:4:4 lossless mode is deliberately excluded because it failed to initialize on the current setup and offers poor editing compatibility.

The default rate-control policy is high-quality VBR with a target near 60 Mbps and a peak near 90 Mbps. These values are defaults, not an unchangeable promise: implementation-time hardware tests may tune them while preserving the quality target. NVENC initialization failure must produce a specific error. The application may offer CPU encoding as an explicit user-selected fallback, but it must never silently reduce quality or change encoders.

### Audio

WASAPI loopback captures the active Windows system-output device at 48 kHz. The application timestamps audio and video against a shared monotonic clock and keeps their timelines synchronized during pauses and resumes. Microphone recording is outside the first-release scope.

### Container and File Safety

The final file is MP4 with H.264 video and AAC audio for Jianying compatibility. During capture, the writer uses fragmented MP4 so completed fragments remain recoverable without a single end-of-file index. On a normal stop, the application remuxes the fragmented recording into a standard MP4 with its index at the front and displays the final location. On the next launch, it detects unfinished fragmented recordings, validates their completed fragments, and offers recovery into a standard MP4. The implementation may use a bundled media library for this narrowly defined muxing and remuxing responsibility, but it must not require a separately installed codec pack.

## Components and Boundaries

- **Source Picker:** Enumerates displays and capturable windows and returns a stable capture target.
- **Capture Session:** Owns Windows Graphics Capture resources and emits timestamped video frames.
- **Focus Zoom Processor:** Converts a source frame into the final output frame; it is a pass-through at 1x.
- **System Audio Capture:** Emits timestamped WASAPI loopback audio packets.
- **Timeline Coordinator:** handles shared timing, pause/resume boundaries, and audio/video synchronization.
- **NVENC Encoder:** Accepts final video frames and produces H.264 packets with explicit quality settings.
- **Recording Writer:** Writes recoverable media, finalizes MP4, and exposes progress and file-size information.
- **Health Monitor:** Tracks dropped frames, encoder latency, disk throughput, and free space.
- **Recording Controller:** Implements the application state machine and coordinates all other components.
- **WPF UI:** Presents selection, controls, recording status, errors, and completed-file actions without owning media logic.

Each media component exposes a narrow interface so capture, processing, encoding, and writing can be tested independently and substituted without rewriting the UI.

## User Experience

The main window contains:

1. A mode choice between display and window capture.
2. A picker for the selected display or open window.
3. A save-directory selector.
4. A primary record button.
5. During recording, elapsed time, approximate file size, and dropped-frame count.
6. Pause/resume and stop controls.
7. After completion, the saved file path and an action to open its folder.

Recording starts after a three-second countdown. The application's recording-status UI is excluded from full-display recordings where the capture API permits exclusion; otherwise the UI minimizes before capture and the limitation is made explicit.

Default global shortcuts are:

- `F9`: start or stop recording.
- `F10`: pause or resume.
- `Ctrl+1`: return to 1x.
- `Ctrl+2`: switch to 1.5x.
- `Ctrl+3`: switch to 2x.
- `Ctrl+Mouse Wheel`: adjust zoom incrementally while recording.

Shortcut registration failures are shown at startup and do not silently disable recording controls.

## State and Data Flow

The recording controller moves through `Idle`, `Countdown`, `Recording`, `Paused`, `Finalizing`, `Completed`, and `Failed` states. Invalid transitions are rejected.

During recording:

1. The capture session emits a timestamped frame.
2. The focus zoom processor passes it through or creates the selected zoom composition.
3. The NVENC encoder converts the final frame into an H.264 packet.
4. WASAPI independently emits timestamped system-audio packets.
5. The timeline coordinator normalizes pause and resume timing.
6. The recording writer interleaves encoded packets into recoverable output.
7. The health monitor publishes non-blocking status updates to the UI.

UI rendering and status updates must not block the media pipeline.

## Error Handling

- **NVENC unavailable:** Stop before recording and show the initialization reason. Offer CPU fallback only by explicit choice.
- **Insufficient disk space:** Estimate required headroom before starting, monitor free space during recording, stop safely before exhaustion, and preserve recorded material.
- **Target window closes:** End capture cleanly and finalize the existing recording.
- **Protected or black frame:** Detect repeated empty frames where feasible and display a capture-compatibility error.
- **Audio device changes:** Notify the user. Continue video capture without audio if automatic loopback recovery cannot be completed safely.
- **Sustained dropped frames:** Display a visible warning and record diagnostic counters; do not silently alter resolution or FPS.
- **Application or system interruption:** Leave recoverable intermediate media and offer recovery at the next launch.
- **Finalization failure:** Preserve intermediate media and report a separate recovery/remux action.

## Quality and Performance Expectations

On the specified PC, the release target is:

- Continuous 2560 x 1440 recording at 60 FPS for at least 30 minutes.
- At 100% viewing scale, UI text and edges remain visually close to the original desktop.
- No intermediate resolution conversion in normal mode.
- Fewer than 0.1% dropped video frames during the 30-minute normal desktop-recording test, with no continuous drop interval longer than 250 ms.
- Direct import into Jianying without an extra conversion step.
- Absolute audio/video timestamp drift remains below 50 ms at the end of a 30-minute recording.
- At a 60 Mbps target bitrate, expected storage use is approximately 4.5 GB per 10 minutes, excluding small container and audio overhead.

These targets require measurement on the actual machine; they are acceptance criteria, not assumptions.

## Verification Strategy

### Automated Tests

- State-machine transition tests, including invalid transitions.
- Zoom crop-boundary and smoothing tests at screen edges.
- Timestamp normalization tests across pause and resume.
- Bitrate and encoder-configuration validation tests.
- Disk-space threshold and safe-stop tests.
- Finalization and interrupted-recording recovery tests using short fixtures.
- Source-picker filtering and closed-target behavior tests where Windows APIs permit automation.

### Hardware Integration Tests

- Confirm NVENC H.264 initialization on the RTX 3070 Ti with the installed driver.
- Record 1440p60 desktop motion and small text for 10 minutes and inspect dropped frames.
- Record for 30 minutes while monitoring CPU, GPU encoder utilization, memory, disk throughput, and synchronization.
- Switch focus zoom levels while recording and verify stable framing and timestamps.
- Close a captured window and verify clean finalization.
- Simulate low disk space and verify a usable partial recording.
- Force an interrupted session and verify next-launch recovery.

### Editing Compatibility Tests

- Import output directly into Jianying.
- Verify reported dimensions, 60 FPS timing, duration, and audio.
- Compare a 100% frame against a lossless screenshot of the source for avoidable blur.
- Export a short Jianying project at 2560 x 1440 using an appropriately high bitrate and distinguish preview quality from final-export quality.

## Release Boundary

The first release is complete when the specified hardware passes the 30-minute recording test, output imports directly into Jianying, 100% source detail is preserved within the expected H.264 compression limits, system audio remains synchronized, and the documented failure cases preserve or recover recordings as designed.
