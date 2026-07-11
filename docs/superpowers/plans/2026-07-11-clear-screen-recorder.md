# Clear Screen Recorder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone Windows recorder that captures a display or window at 2560 x 1440 and 60 FPS, records system audio, encodes through RTX 3070 Ti NVENC, supports live focus zoom, and produces recoverable MP4 files that import directly into Jianying.

**Architecture:** A .NET 8 WPF shell coordinates isolated capture, GPU processing, audio, timeline, encoding, writing, health, and recovery components. Windows Graphics Capture emits D3D11 frames; a GPU pass-through/crop stage feeds FFmpeg 8.1 NVENC; NAudio WASAPI loopback supplies timestamped audio; fragmented MP4 is remuxed to a standard fast-start MP4 after recording.

**Tech Stack:** C# 12, .NET 8.0.422, WPF, Windows.Graphics.Capture, Vortice.Direct3D11 3.8.3, Vortice.DXGI 3.8.3, NAudio 2.3.0, FFmpeg.AutoGen 8.1.0, FFmpeg 8.1 shared LGPL build with NVENC, xUnit 2.9.3, FluentAssertions 8.8.0.

---

## File Structure

Create the recorder as a sibling solution under `tools/ClearScreenRecorder/` so it remains independent of the existing React application.

- `ClearScreenRecorder.slnx`: solution entry point.
- `Directory.Build.props`: shared nullable, warning, and Windows target settings.
- `Directory.Packages.props`: pinned NuGet versions.
- `src/ClearScreenRecorder.App/`: WPF composition root, views, view models, dialogs, and hotkeys.
- `src/ClearScreenRecorder.Core/`: state machine, contracts, timing, zoom math, health policies, and recovery rules; no WPF or native capture dependencies.
- `src/ClearScreenRecorder.Windows/`: Windows Graphics Capture, D3D11 processing, WASAPI, native FFmpeg/NVENC, muxing, target enumeration, and Win32 hotkeys.
- `tests/ClearScreenRecorder.Core.Tests/`: deterministic unit tests.
- `tests/ClearScreenRecorder.Windows.Tests/`: Windows and actual-hardware integration tests, separated with traits.
- `scripts/Get-RecorderDependencies.ps1`: downloads and verifies the pinned FFmpeg runtime.
- `scripts/Test-RecorderHardware.ps1`: performs environment and NVENC preflight checks.
- `artifacts/recorder/`: ignored build output.

## Task 1: Install the SDK and Scaffold the Solution

**Files:**
- Create: `tools/ClearScreenRecorder/global.json`
- Create: `tools/ClearScreenRecorder/Directory.Build.props`
- Create: `tools/ClearScreenRecorder/Directory.Packages.props`
- Create: `tools/ClearScreenRecorder/ClearScreenRecorder.slnx`
- Create: `tools/ClearScreenRecorder/src/ClearScreenRecorder.Core/ClearScreenRecorder.Core.csproj`
- Create: `tools/ClearScreenRecorder/src/ClearScreenRecorder.Windows/ClearScreenRecorder.Windows.csproj`
- Create: `tools/ClearScreenRecorder/src/ClearScreenRecorder.App/ClearScreenRecorder.App.csproj`
- Create: `tools/ClearScreenRecorder/tests/ClearScreenRecorder.Core.Tests/ClearScreenRecorder.Core.Tests.csproj`
- Create: `tools/ClearScreenRecorder/tests/ClearScreenRecorder.Windows.Tests/ClearScreenRecorder.Windows.Tests.csproj`
- Modify: `.gitignore`

- [ ] **Step 1: Install the pinned SDK and verify it**

Run:

```powershell
winget install Microsoft.DotNet.SDK.8 --version 8.0.422 --accept-package-agreements --accept-source-agreements
dotnet --list-sdks
```

Expected: output contains `8.0.422`.

- [ ] **Step 2: Add the pinned SDK file**

```json
{
  "sdk": {
    "version": "8.0.422",
    "rollForward": "latestPatch"
  }
}
```

- [ ] **Step 3: Add shared build settings and package versions**

`Directory.Build.props`:

```xml
<Project>
  <PropertyGroup>
    <TargetFramework>net8.0-windows10.0.19041.0</TargetFramework>
    <PlatformTarget>x64</PlatformTarget>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
    <LangVersion>12</LangVersion>
  </PropertyGroup>
</Project>
```

`Directory.Packages.props` pins `Vortice.Direct3D11` and `Vortice.DXGI` to `3.8.3`, `NAudio` to `2.3.0`, `FFmpeg.AutoGen` to `8.1.0`, `xunit` to `2.9.3`, `xunit.runner.visualstudio` to `3.1.5`, `Microsoft.NET.Test.Sdk` to `17.14.1`, and `FluentAssertions` to `8.8.0` using central package management.

- [ ] **Step 4: Scaffold projects and references**

Run from `tools/ClearScreenRecorder`:

```powershell
dotnet new sln --format slnx -n ClearScreenRecorder
dotnet new classlib -n ClearScreenRecorder.Core -o src/ClearScreenRecorder.Core
dotnet new classlib -n ClearScreenRecorder.Windows -o src/ClearScreenRecorder.Windows
dotnet new wpf -n ClearScreenRecorder.App -o src/ClearScreenRecorder.App
dotnet new xunit -n ClearScreenRecorder.Core.Tests -o tests/ClearScreenRecorder.Core.Tests
dotnet new xunit -n ClearScreenRecorder.Windows.Tests -o tests/ClearScreenRecorder.Windows.Tests
dotnet sln add (Get-ChildItem -Recurse -Filter *.csproj).FullName
dotnet add src/ClearScreenRecorder.Windows reference src/ClearScreenRecorder.Core
dotnet add src/ClearScreenRecorder.App reference src/ClearScreenRecorder.Core src/ClearScreenRecorder.Windows
dotnet add tests/ClearScreenRecorder.Core.Tests reference src/ClearScreenRecorder.Core
dotnet add tests/ClearScreenRecorder.Windows.Tests reference src/ClearScreenRecorder.Core src/ClearScreenRecorder.Windows
```

Add package references only to the projects that use them: Vortice/NAudio/FFmpeg to `Windows`, xUnit/FluentAssertions to tests.

- [ ] **Step 5: Ignore generated and native artifacts**

Append:

```gitignore
tools/ClearScreenRecorder/**/bin/
tools/ClearScreenRecorder/**/obj/
tools/ClearScreenRecorder/native/ffmpeg/
tools/ClearScreenRecorder/artifacts/
```

- [ ] **Step 6: Verify and commit**

Run `dotnet build ClearScreenRecorder.slnx -warnaserror`; expect `0 Warning(s), 0 Error(s)`.

```powershell
git add .gitignore tools/ClearScreenRecorder
git commit -m "build: scaffold clear screen recorder"
```

## Task 2: Define Core Contracts and the Recording State Machine

**Files:**
- Create: `src/ClearScreenRecorder.Core/Recording/RecordingState.cs`
- Create: `src/ClearScreenRecorder.Core/Recording/RecordingCommand.cs`
- Create: `src/ClearScreenRecorder.Core/Recording/RecordingStateMachine.cs`
- Create: `src/ClearScreenRecorder.Core/Media/MediaContracts.cs`
- Test: `tests/ClearScreenRecorder.Core.Tests/Recording/RecordingStateMachineTests.cs`

- [ ] **Step 1: Write failing transition tests**

Test the exact legal path `Idle -> Countdown -> Recording -> Paused -> Recording -> Finalizing -> Completed -> Idle`, and assert that `Pause` from `Idle` throws `InvalidOperationException` containing both the state and command.

```csharp
[Fact]
public void Pause_from_idle_is_rejected()
{
    var machine = new RecordingStateMachine();
    var act = () => machine.Apply(RecordingCommand.Pause);
    act.Should().Throw<InvalidOperationException>()
        .WithMessage("*Idle*Pause*");
}
```

- [ ] **Step 2: Run the test and confirm it fails**

Run `dotnet test --filter FullyQualifiedName~RecordingStateMachineTests`; expect compilation failure because the types do not exist.

- [ ] **Step 3: Implement the state model and narrow media contracts**

Define states `Idle`, `Countdown`, `Recording`, `Paused`, `Finalizing`, `Completed`, `Failed`; commands `BeginCountdown`, `BeginCapture`, `Pause`, `Resume`, `Stop`, `FinalizeSucceeded`, `Fail`, `Reset`. Implement transitions with a dictionary keyed by `(RecordingState, RecordingCommand)`.

Define immutable records `VideoFrame(long TimestampTicks, object NativeSurface, int Width, int Height)`, `AudioPacket(long TimestampTicks, ReadOnlyMemory<byte> Data, int SampleRate, int Channels)`, `EncodedPacket(long TimestampTicks, ReadOnlyMemory<byte> Data, MediaStreamKind Kind, bool IsKeyFrame)`, and interfaces `IVideoSource`, `IVideoProcessor`, `IAudioSource`, `IMediaEncoder`, `IRecordingWriter`, and `IClock`. Native lifetime ownership must be explicit through `IDisposable`/`IAsyncDisposable` on source, frame, encoder, and writer contracts rather than leaving raw surfaces unowned.

- [ ] **Step 4: Run all core tests and commit**

Run `dotnet test tests/ClearScreenRecorder.Core.Tests`; expect all tests pass.

```powershell
git add tools/ClearScreenRecorder/src/ClearScreenRecorder.Core tools/ClearScreenRecorder/tests/ClearScreenRecorder.Core.Tests
git commit -m "feat: add recording state model"
```

## Task 3: Implement Target Discovery and Windows Capture

**Files:**
- Create: `src/ClearScreenRecorder.Core/Capture/CaptureTarget.cs`
- Create: `src/ClearScreenRecorder.Windows/Capture/CaptureTargetService.cs`
- Create: `src/ClearScreenRecorder.Windows/Capture/GraphicsCaptureItemFactory.cs`
- Create: `src/ClearScreenRecorder.Windows/Capture/WindowsGraphicsCaptureSource.cs`
- Test: `tests/ClearScreenRecorder.Windows.Tests/Capture/CaptureTargetServiceTests.cs`
- Test: `tests/ClearScreenRecorder.Windows.Tests/Capture/WindowsGraphicsCaptureSmokeTests.cs`

- [ ] **Step 1: Write target-filter and capture-support tests**

Assert target enumeration returns the active 2560 x 1440 display, excludes invisible/tool/zero-size windows, and that `GraphicsCaptureSession.IsSupported()` is true. Mark the live-frame test `[Trait("Category", "Hardware")]` and require one frame within two seconds.

- [ ] **Step 2: Run tests and verify failure**

Run `dotnet test --filter Category!=Hardware`; expect missing implementation failures.

- [ ] **Step 3: Implement target enumeration and WGC interop**

Represent targets as:

```csharp
public sealed record CaptureTarget(
    CaptureTargetKind Kind,
    nint NativeHandle,
    string DisplayName,
    int Width,
    int Height);
```

Use `EnumDisplayMonitors` for displays and `EnumWindows` plus `IsWindowVisible`, extended-style checks, and client bounds for windows. Use `IGraphicsCaptureItemInterop.CreateForMonitor/CreateForWindow` to create the selected item. Create one D3D11 device, a free-threaded `Direct3D11CaptureFramePool`, and a `GraphicsCaptureSession`; copy or retain each texture with deterministic lifetime and recreate the pool when `ContentSize` changes.

- [ ] **Step 4: Verify actual capture and commit**

Run `dotnet test --filter FullyQualifiedName~Capture`; expect unit tests and the hardware frame smoke test to pass on this PC.

```powershell
git add tools/ClearScreenRecorder/src tools/ClearScreenRecorder/tests
git commit -m "feat: capture displays and windows with WGC"
```

## Task 4: Prove the WGC-to-NVENC-to-fMP4 Hardware Path

**Files:**
- Create: `scripts/Get-RecorderDependencies.ps1`
- Create: `scripts/Test-RecorderHardware.ps1`
- Create: `src/ClearScreenRecorder.Windows/Encoding/FFmpegRuntime.cs`
- Create: `src/ClearScreenRecorder.Windows/Encoding/NvencProbe.cs`
- Create: `src/ClearScreenRecorder.Windows/Encoding/NvencVideoEncoder.cs`
- Create: `src/ClearScreenRecorder.Windows/Writing/FragmentedMp4Writer.cs`
- Test: `tests/ClearScreenRecorder.Windows.Tests/Encoding/NvencHardwareSpikeTests.cs`

- [ ] **Step 1: Pin and verify the native FFmpeg runtime**

`Get-RecorderDependencies.ps1` must contain a fixed HTTPS release URL, expected SHA-256, destination `native/ffmpeg`, and fail if the checksum differs. It must extract only the required DLLs and license files. Record the source URL, FFmpeg configuration string, and LGPL/GPL status in `native/NOTICE.md`; do not accept an unversioned `latest` URL.

- [ ] **Step 2: Write the failing hardware spike**

The test captures ten seconds from the primary display, encodes exactly 600 frames with `h264_nvenc`, `profile=high`, `pix_fmt=nv12`, `b=60M`, `maxrate=90M`, `g=120`, writes fragmented MP4 using `movflags=frag_keyframe+empty_moov+default_base_moof`, closes it, and probes width, height, average frame rate, codec, and frame count.

- [ ] **Step 3: Run and observe the expected failure**

Run `./scripts/Get-RecorderDependencies.ps1` and then `dotnet test --filter FullyQualifiedName~NvencHardwareSpikeTests`; expect failure until runtime binding and encoder code exist.

- [ ] **Step 4: Implement runtime loading, NVENC probe, encoder, and fMP4 writer**

Bind the exact FFmpeg 8.1 DLL directory before any FFmpeg call. `NvencProbe` must locate `h264_nvenc`, open a 2560 x 1440 NV12 context with the settings above, and return a typed failure containing FFmpeg's error text. The encoder converts the D3D11 BGRA surface to NV12 on-GPU when supported, transfers only as an explicit fallback, and emits owned packets. The writer rescales packet timestamps to stream time bases and interleaves packets with `av_interleaved_write_frame`.

- [ ] **Step 5: Enforce the hardware gate and commit**

Run the ten-second test twice. Expected: both outputs report 2560 x 1440, H.264, 60 FPS, 600 frames, and play successfully. If this gate fails, stop execution and investigate the native/GPU path before any UI work.

```powershell
git add tools/ClearScreenRecorder/scripts tools/ClearScreenRecorder/src tools/ClearScreenRecorder/tests
git commit -m "feat: prove NVENC recording pipeline"
```

## Task 5: Implement Focus Zoom as a Deterministic GPU Transform

**Files:**
- Create: `src/ClearScreenRecorder.Core/Zoom/ZoomState.cs`
- Create: `src/ClearScreenRecorder.Core/Zoom/ZoomViewportCalculator.cs`
- Create: `src/ClearScreenRecorder.Windows/Processing/D3D11FocusZoomProcessor.cs`
- Create: `src/ClearScreenRecorder.Windows/Processing/Shaders/FocusZoom.hlsl`
- Test: `tests/ClearScreenRecorder.Core.Tests/Zoom/ZoomViewportCalculatorTests.cs`
- Test: `tests/ClearScreenRecorder.Windows.Tests/Processing/FocusZoomGpuTests.cs`

- [ ] **Step 1: Write failing boundary and smoothing tests**

Test 1x pass-through, 1.5x and 2x centered crops, all four screen edges, cursor jumps, and clamping to `[1.0, 2.0]`. Use exponential smoothing `next = current + (target - current) * 0.18` per output frame and assert exact rectangles for fixed inputs.

- [ ] **Step 2: Implement zoom math and pass core tests**

`ZoomViewportCalculator.Next(Size source, Point pointer, ZoomState state)` returns a source rectangle only; it has no Windows or GPU dependency. Run the zoom unit tests and expect pass.

- [ ] **Step 3: Write and implement the GPU transform**

At 1x, copy the source texture without sampling or resizing. Above 1x, sample the calculated crop into a fixed 2560 x 1440 output texture using a linear sampler. Compile `FocusZoom.hlsl` at build time and assert the output texture dimensions and corner colors in the GPU test.

- [ ] **Step 4: Commit**

```powershell
git add tools/ClearScreenRecorder/src tools/ClearScreenRecorder/tests
git commit -m "feat: add GPU focus zoom"
```

## Task 6: Capture System Audio and Coordinate the Timeline

**Files:**
- Create: `src/ClearScreenRecorder.Core/Timing/MonotonicClock.cs`
- Create: `src/ClearScreenRecorder.Core/Timing/TimelineCoordinator.cs`
- Create: `src/ClearScreenRecorder.Windows/Audio/WasapiSystemAudioSource.cs`
- Test: `tests/ClearScreenRecorder.Core.Tests/Timing/TimelineCoordinatorTests.cs`
- Test: `tests/ClearScreenRecorder.Windows.Tests/Audio/WasapiLoopbackTests.cs`

- [ ] **Step 1: Write failing pause/resume timing tests**

Use a fake clock to assert timestamps start at zero, exclude paused duration, never decrease, and produce less than one audio-frame rounding error after a 30-minute simulated session.

- [ ] **Step 2: Implement the timeline coordinator**

Store capture start ticks and accumulated paused ticks. Normalize every raw timestamp with `(raw - started - paused)`, clamp it above the previous timestamp per stream, and expose `Pause(at)`/`Resume(at)`.

- [ ] **Step 3: Implement WASAPI loopback**

Use `WasapiLoopbackCapture` on the active default render endpoint, convert its mix format to 48 kHz stereo float or signed 16-bit PCM once, timestamp packets from the shared clock, and raise `AudioDeviceLost` without terminating video capture.

- [ ] **Step 4: Verify and commit**

Play a known local test tone, run the hardware audio test for five seconds, and expect non-silent 48 kHz stereo samples.

```powershell
git add tools/ClearScreenRecorder/src tools/ClearScreenRecorder/tests
git commit -m "feat: capture and synchronize system audio"
```

## Task 7: Add AAC, Interleaving, Finalization, and Recovery

**Files:**
- Create: `src/ClearScreenRecorder.Windows/Encoding/AacAudioEncoder.cs`
- Create: `src/ClearScreenRecorder.Windows/Writing/RecordingPaths.cs`
- Create: `src/ClearScreenRecorder.Windows/Writing/Mp4Finalizer.cs`
- Create: `src/ClearScreenRecorder.Windows/Recovery/RecordingRecoveryService.cs`
- Test: `tests/ClearScreenRecorder.Windows.Tests/Writing/RecordingWriterTests.cs`
- Test: `tests/ClearScreenRecorder.Windows.Tests/Recovery/RecordingRecoveryTests.cs`

- [ ] **Step 1: Write failing mux and recovery tests**

Generate ten seconds of synthetic color frames and a 1 kHz audio tone. Assert the finalized MP4 contains H.264 video, AAC 48 kHz stereo audio, a front-loaded index, and A/V end timestamps within 50 ms. Truncate a fragmented fixture only at a fragment boundary and assert recovery creates a playable standard MP4.

- [ ] **Step 2: Implement AAC and interleaving**

Encode AAC-LC at 192 kbps and 48 kHz stereo. Queue encoded packets by normalized timestamp, write the earliest packet first, and bound each queue to one second; if a source stalls, advance the other after the bound and report a health event.

- [ ] **Step 3: Implement paths, finalization, and recovery**

Write active files as `<timestamp>.recording.mp4`, finalized files as `<timestamp>.mp4`, and metadata sidecars as `<timestamp>.recording.json`. Finalization remuxes without re-encoding to a temporary `.finalizing.mp4`, validates it with FFmpeg, atomically renames it, then removes the intermediate. Recovery scans only sidecars owned by the app, validates completed fragments, and never overwrites an existing final file.

- [ ] **Step 4: Verify and commit**

Run writing and recovery tests; expect all pass and no orphaned temp files.

```powershell
git add tools/ClearScreenRecorder/src tools/ClearScreenRecorder/tests
git commit -m "feat: finalize and recover recordings"
```

## Task 8: Add Health Policies and the Recording Controller

**Files:**
- Create: `src/ClearScreenRecorder.Core/Health/RecordingHealth.cs`
- Create: `src/ClearScreenRecorder.Core/Health/DiskSpacePolicy.cs`
- Create: `src/ClearScreenRecorder.Core/Recording/RecordingController.cs`
- Test: `tests/ClearScreenRecorder.Core.Tests/Health/DiskSpacePolicyTests.cs`
- Test: `tests/ClearScreenRecorder.Core.Tests/Recording/RecordingControllerTests.cs`

- [ ] **Step 1: Write failing orchestration tests**

With fakes, assert three-second countdown, startup order writer/audio/video, pause propagation, safe stop order video/audio/encoder/writer/finalizer, target-close stop, explicit NVENC failure, audio-device-loss continuation, low-disk safe stop, and failure transition preserving the intermediate path.

- [ ] **Step 2: Implement health models and disk policy**

`RecordingHealth` includes elapsed time, bytes written, captured frames, dropped frames, longest drop interval, encoder latency, and free bytes. Refuse startup below 6 GB free. During recording, request safe stop below 2 GB free. Emit a warning when dropped frames exceed 0.1% or a continuous gap exceeds 250 ms.

- [ ] **Step 3: Implement the controller**

The controller is the sole owner of state transitions and component lifetimes. It exposes async `StartAsync`, `PauseAsync`, `ResumeAsync`, and `StopAsync`, uses a single `SemaphoreSlim` to serialize commands, links cancellation tokens, and publishes immutable status snapshots.

- [ ] **Step 4: Verify and commit**

Run all core tests; expect pass.

```powershell
git add tools/ClearScreenRecorder/src/ClearScreenRecorder.Core tools/ClearScreenRecorder/tests/ClearScreenRecorder.Core.Tests
git commit -m "feat: orchestrate safe recording sessions"
```

## Task 9: Build the WPF UI and Global Hotkeys

**Files:**
- Create: `src/ClearScreenRecorder.App/ViewModels/MainViewModel.cs`
- Create: `src/ClearScreenRecorder.App/Views/MainWindow.xaml`
- Create: `src/ClearScreenRecorder.App/Views/MainWindow.xaml.cs`
- Create: `src/ClearScreenRecorder.Windows/Input/GlobalHotkeyService.cs`
- Create: `src/ClearScreenRecorder.Windows/Input/PointerService.cs`
- Create: `src/ClearScreenRecorder.App/Services/DialogService.cs`
- Test: `tests/ClearScreenRecorder.Core.Tests/ViewModels/MainViewModelTests.cs`
- Test: `tests/ClearScreenRecorder.Windows.Tests/Input/GlobalHotkeyServiceTests.cs`

- [ ] **Step 1: Write failing view-model tests**

Assert source mode switches between display/window lists, record is disabled without a target/save directory, status changes expose the correct buttons, completed output exposes `OpenFolder`, and errors contain an actionable message without a raw stack trace.

- [ ] **Step 2: Implement the view model and main window**

The UI contains source mode, target picker, save path, Record/Pause/Stop buttons, elapsed time, file size, dropped frames, and a compact error/status banner. Bind commands to the controller; keep media work off the dispatcher thread.

- [ ] **Step 3: Implement hotkeys and pointer input**

Register `F9`, `F10`, `Ctrl+1`, `Ctrl+2`, and `Ctrl+3` using `RegisterHotKey`; route `Ctrl+MouseWheel` only while the app owns an active recording and a low-level mouse hook is installed. Unregister everything deterministically. A registration collision returns the exact shortcut and Win32 error to the UI.

- [ ] **Step 4: Prevent the app UI entering display capture**

Before the countdown completes, minimize the window for full-display capture and restore it after stop. Use `WDA_EXCLUDEFROMCAPTURE` where supported, but test the actual Windows 10 build and treat minimization as the reliable fallback.

- [ ] **Step 5: Verify and commit**

Run UI/view-model and hotkey tests, then manually exercise each shortcut.

```powershell
git add tools/ClearScreenRecorder/src tools/ClearScreenRecorder/tests
git commit -m "feat: add recorder controls and hotkeys"
```

## Task 10: End-to-End Quality, Failure, and Jianying Verification

**Files:**
- Create: `tests/ClearScreenRecorder.Windows.Tests/EndToEnd/ThirtyMinuteRecordingTests.cs`
- Create: `tests/ClearScreenRecorder.Windows.Tests/EndToEnd/FailureRecoveryTests.cs`
- Create: `docs/recorder-verification.md`
- Create: `scripts/Measure-Recording.ps1`

- [ ] **Step 1: Add the opt-in 30-minute test**

Mark it `[Trait("Category", "LongRunningHardware")]`. Record the primary display at 1440p60 with system audio and collect captured/dropped frames, longest frame gap, final A/V timestamps, CPU, GPU encoder utilization, memory, and disk throughput.

- [ ] **Step 2: Add measurable assertions**

Assert 2560 x 1440, nominal 60 FPS, dropped frames below 0.1%, longest gap below 250 ms, final A/V drift below 50 ms, no monotonic timestamp violations, and successful FFmpeg decode of the entire output.

- [ ] **Step 3: Exercise failures**

Close a captured window, simulate the disk policy threshold through a fake volume provider, interrupt a child test process after completed fragments exist, and verify each case preserves or finalizes a playable recording. Disconnect/change the default audio endpoint and verify video continues with a visible warning.

- [ ] **Step 4: Verify Jianying manually**

Import the finalized file, confirm Jianying reports 2560 x 1440 and 60 FPS, scrub across the full duration, confirm audio, export a 10-second 1440p high-bitrate clip, and compare a 100% crop with a lossless source screenshot. Document the exact Jianying project and export settings in `docs/recorder-verification.md`.

- [ ] **Step 5: Commit evidence**

Commit the verification document and scripts, but exclude generated recordings and performance logs containing local paths.

```powershell
git add tools/ClearScreenRecorder/tests tools/ClearScreenRecorder/scripts tools/ClearScreenRecorder/docs
git commit -m "test: verify recorder quality and recovery"
```

## Task 11: Publish a Self-Contained Windows Build

**Files:**
- Create: `src/ClearScreenRecorder.App/app.manifest`
- Create: `scripts/Publish-Recorder.ps1`
- Create: `README.md`
- Modify: `src/ClearScreenRecorder.App/ClearScreenRecorder.App.csproj`

- [ ] **Step 1: Add the manifest and publish configuration**

Declare Windows 10 compatibility and per-monitor-v2 DPI awareness. Publish `win-x64`, self-contained, single-file disabled because FFmpeg DLLs remain adjacent, trimmed disabled for WinRT/native interop, ReadyToRun enabled. Copy only required FFmpeg DLLs and license notices.

- [ ] **Step 2: Write the publish script**

The script runs dependency checksum verification, unit tests, non-long-running hardware smoke tests, `dotnet publish -c Release -r win-x64 --self-contained true`, copies native dependencies, starts the published executable with `--preflight`, and writes output only to `artifacts/recorder/win-x64`.

- [ ] **Step 3: Document use and quality limits**

Document screen/window choice, save directory, hotkeys, expected storage, NVENC preflight errors, recovery, and the non-negotiable fact that zooming a native 1440p source cannot create extra source detail.

- [ ] **Step 4: Run final verification**

Run:

```powershell
./scripts/Publish-Recorder.ps1
./artifacts/recorder/win-x64/ClearScreenRecorder.App.exe --preflight
```

Expected: exit code 0; report Windows Graphics Capture supported, RTX 3070 Ti NVENC available, default render device available, and adequate free disk space.

- [ ] **Step 5: Commit**

```powershell
git add tools/ClearScreenRecorder
git commit -m "build: publish clear screen recorder"
```

## Execution Checkpoints

- Stop after Task 4 if the actual WGC-to-NVENC hardware gate fails; debug that path before proceeding.
- Stop after Task 7 and play/import the short A/V fixture before building the UI.
- Stop after Task 10 for the user's Jianying confirmation before calling the release complete.

