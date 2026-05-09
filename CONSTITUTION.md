# MeetMind Project Constitution

This document serves as the "Source of Truth" for design, UX, and architectural standards of the MeetMind application. All AI assistants and developers must adhere to these rules.

## 1. Design & Aesthetics
- **Theme Color**: Use **Rose** (`rose-500`, `rose-600`) for Polling and interaction-heavy elements to maintain consistency with the sidebar branding.
- **Aesthetic Style**: Premium, modern, floating UI with rounded corners (`rounded-[2.5rem]` or `rounded-[3rem]`).
- **Typography**: 
    - **NEVER** use `uppercase` for section headers, labels, or titles (e.g., "Người tham gia" instead of "NGƯỜI THAM GIA").
    - Prefer sentence case for a more approachable and premium feel.
    - Sidebar tab titles must be **horizontally centered** within the header.

## 2. Layout & Responsive Behavior
- **Meeting Main Stage**:
    - When the sidebar is hidden, the main stage (video grid) must **NOT expand to fill 100% width** if it causes the content to lose its floating aspect or scale excessively.
    - Instead, it should **center itself horizontally** and maintain its proportional size (max-width constrained to approximately the width it had when the sidebar was open).
    - Maintain a consistent padding (`px-12 py-10`) to ensure rounded corners are always visible.

## 3. UI/UX Patterns
- **Polling**:
    - The "Create Poll" form must always be presented as a **floating Popup/Modal**, not as an inline form within a sidebar tab.
    - Poll results and history are displayed within the sidebar "Polling" tab.
    - Support both **Single choice** ("Lựa chọn duy nhất") and **Multiple choice** ("Nhiều lựa chọn").
- **Modals**: 
    - Use a light theme (`bg-white`) with high contrast text (`text-slate-900`) for better readability against the dark meeting background.
    - Use `backdrop-blur-sm` with a slate overlay for modals.

## 4. Localization
- **Primary Language**: Vietnamese (VI) as the main target, with English (EN) support.
- **Terminologies**: Use "Bình chọn" instead of "Thăm dò".

---
*Last Updated: 2026-05-10*
