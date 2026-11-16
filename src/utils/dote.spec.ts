import { describe, expect, it } from "vitest";
import type { RecordedHotkey } from "v-record-hotkey";
import { recordedHotkeyToElectronAccelerator } from "./dote";

describe("recorded hotkey to Electron accelerator", () => {
  it.each([
    [{ code: "KeyK", key: "˚", modifiers: ["Alt", "Meta"] }, "Alt+Meta+K"],
    [{ code: "Digit1", key: "!", modifiers: ["Shift"] }, "Shift+1"],
    [{ code: "Space", key: " ", modifiers: ["Ctrl"] }, "Ctrl+Space"],
    [{ code: "Equal", key: "+", modifiers: ["Ctrl", "Shift"] }, "Ctrl+Shift+Plus"],
    [{ code: "ArrowLeft", key: "ArrowLeft", modifiers: ["Meta"] }, "Meta+Left"],
    [{ code: "Numpad1", key: "1", modifiers: ["Ctrl"] }, "Ctrl+num1"],
    [{ code: "NumpadAdd", key: "+", modifiers: ["Ctrl"] }, "Ctrl+numadd"],
    [{ code: "F12", key: "F12", modifiers: [] }, "F12"],
    [{ code: "ShiftLeft", key: "Shift", modifiers: ["Shift"] }, null],
    [{ code: "IntlYen", key: "¥", modifiers: ["Meta"] }, null],
    [{ code: "", key: "Unidentified", modifiers: [] }, null],
  ] satisfies [Omit<RecordedHotkey, "location">, string | null][])("converts %j to %s", (hotkey, expected) => {
    expect(recordedHotkeyToElectronAccelerator({ ...hotkey, location: 0 })).toBe(expected);
  });
});
