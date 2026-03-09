import "@testing-library/jest-dom";
import { vi } from "vitest";

// Suppress console.log in tests unless explicitly needed
vi.spyOn(console, "log").mockImplementation(() => {});
