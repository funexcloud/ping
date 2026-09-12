# PING Mobile Mockup Canonical

Status: LOCKED  
Scope: PING mobile mockup / landing / send flow / sending / completion / status  
Repository target: `D:\USER\ping_funex`

Follow the canonical reference images and PING Mobile Mockup Canonical.
Do not redesign the smartphone mockup or mobile UI language.
Reuse the shared phone mockup component.
Preserve all protected functional logic.  
Canonical reference images (3):

- `docs/references/ping-brand/ping-app-logo-canonical.png`
- `docs/references/ping-mobile/ping-mobile-contacts-canonical.png`
- `docs/references/ping-mobile/ping-mobile-sending-canonical.png`

Runtime logo:

- `public/brand/ping/ping-app-logo-canonical.png`

Source copies (do not treat as extra designs):

- `references/ping-app-logo-canonical.png.png`
- `references/ping-mobile-mockup-contacts.png.png`
- `references/ping-mobile-mockup-sending.png.png`

---

## Canonical Brand Asset

Official logo path (runtime): `/brand/ping/ping-app-logo-canonical.png`

The approved PING logo is a locked canonical brand asset. Do not recreate, reinterpret, or replace the PING symbol or wordmark without explicit approval.

Usage:

- App / profile / header: full lockup (P symbol + PING)
- Sending center: P symbol derived from the same file (crop/fit only — no new icon)
- Tiny icon / favicon / PWA: same family, derived from the canonical PNG

Product name is always `PING` (all caps).

---

## 1. Purpose

This document defines the single canonical smartphone mockup and mobile UI language for PING.

The mockup style must not be reinterpreted per page, agent, prompt, or marketing asset.

The same visual system must be used across:

- Landing page hero mockup
- Landing page step-by-step mobile demonstrations
- Actual send flow UI
- Contact selection
- Sending state
- Send completion
- Delivery/status view
- Product screenshots and promotional materials

The goal is that the landing mockup and the real product feel like the same product.

---

## 2. Canonical Reference Priority

When implementation text and screenshots conflict, use the following priority:

1. The three canonical references (logo, contacts, sending)
2. This document
3. Existing PING brand tokens
4. Existing implementation details

Do not invent a new smartphone frame or a new visual language without explicit approval.

---

## 3. Device Mockup Lock

PING uses a generic smartphone mockup.

### Required

- Brand-neutral smartphone silhouette
- Portrait orientation
- Approximate 9:19 aspect ratio
- White or very light gray body
- Large rounded corners
- Thin soft outer stroke
- Soft floating shadow
- Clean, lightweight product-render appearance

### Prohibited

- iPhone-specific body
- Galaxy-specific body
- Dynamic Island
- Notch
- Camera hole
- Manufacturer logo
- Device-specific side buttons as a visual feature
- Thick black bezel
- Metallic photorealistic frame
- Heavy 3D reflection
- Different device shapes per page

The smartphone exists to frame PING UI, not to advertise a device model.

---

## 4. UI Visual Language Lock

### Base

- Background: white / very light cool gray
- Primary text: deep navy
- Primary action/accent: PING blue
- Secondary text: muted blue-gray
- Border: subtle cool gray
- Shadow: soft and low contrast

### Character

The UI must feel:

- Clean
- Calm
- Accurate
- Trustworthy
- Easy to scan
- Realistically usable

Avoid decorative SaaS-dashboard density.

### Tokens (reuse existing runtime tokens)

| Token | Value |
|-------|--------|
| Primary | `#0056F3` |
| Navy text / mockup CTA | `#191f28` (`--ping-ui-text`) |
| Muted | `#6b7684` |
| Hint | `#b0b8c1` |
| Device radius | `2.15rem` |
| Screen radius | `1.7rem` |
| Control radius | `14px` |
| CTA radius | `16px` |
| CTA height | `52px` |
| Device shadow | `0 22px 48px rgba(15, 23, 42, 0.12)` |
| Aspect | `9 / 19.2` |
| Canonical viewport | `375px` |

Do not invent a second primary blue.

---

## 5. Information Hierarchy

PING mobile screens prioritize status and action.

### Preferred hierarchy

1. Current task/state
2. Large primary number or count
3. Supporting status/progress
4. One clear primary CTA
5. Secondary detail

Examples:

- `내 연락처 328명`
- `173 / 328`
- `173명에게 전달되었습니다`
- `발송 성공 171`
- `확인 필요 2`

Large numbers are a core PING UI language.

---

## 6. Header Lock

Use one consistent mobile header family.

### Default

- PING symbol + `PING`
- Optional menu icon on the right
- Minimal chrome

### Flow screens

Back navigation may replace the brand lockup where necessary, but spacing and hierarchy must remain consistent.

Do not create a different header style for each route.

---

## 7. Contact Selection Canonical

The contacts reference image is the canonical source for:

- Contact list spacing
- Search field scale
- Selection checkbox style
- Avatar scale
- Name / phone-number hierarchy
- Selected count treatment
- Primary CTA placement

### Required behavior

The UI may visually change, but the existing contact import, parsing, normalization, deduplication, permission, and recipient state logic must remain untouched unless a separate functional task explicitly authorizes changes.

---

## 8. Sending State Canonical

The sending reference image is the canonical source for:

- `발송 중` hierarchy
- Central PING symbol
- Expanding signal/ring motif
- Large progress count
- Progress bar
- Three-step status checklist
- Bottom reassurance copy

### Status hierarchy

```text
발송 중

PING signal visual

173 / 328

progress bar

연락처 확인 중
메시지 발송 중
전달 결과 수신 중

잠시만 기다려주세요.
PING이 안전하게 전달하고 있습니다.
```

Do not turn the sending state into a complex analytics dashboard.

---

## 9. Send Completion Canonical

Completion must remain visually simple.

Preferred structure:

```text
발송 완료

large success icon

173명에게
전달되었습니다.

발송 성공 171
확인 필요 2
```

A single primary next action may follow.

Do not overload the completion screen with charts unless the user opens detailed status.

---

## 10. Landing / Runtime Parity

The landing-page mockup and actual runtime UI must share:

- Device silhouette
- Corner radius
- Shadow
- Header style
- Typography hierarchy
- Search/input style
- Checkbox language
- CTA shape
- Progress treatment
- Success treatment
- Spacing rhythm

The landing page must not depict a prettier fictional product that differs from production.

---

## 11. Shared Component Rule

Create and reuse a shared mockup shell instead of duplicating device markup.

Recommended concept:

```text
PhoneMockup
├─ PhoneHeader
├─ PhoneContent
└─ PhoneFooter / CTA
```

The exact components in this repository:

```text
PhoneMockup                 src/components/ping-mobile/phone-mockup.tsx
PingMobileContactsScreen    src/components/ping-mobile/ping-mobile-screens.tsx
PingMobileSendingScreen
PingMobileCompletionScreen
PhoneDeviceFrame            thin wrapper around PhoneMockup
```

Visual tokens live in `src/components/ping-mobile/phone-mockup.css`.
Primary brand color remains `#0056F3`. CTA navy uses existing `--ping-ui-text` (`#191f28`).


### Locked responsibility of the shared component

- Device silhouette
- Radius
- Border
- Shadow
- Internal safe spacing
- Background
- Overflow behavior

Individual screens should provide only their content/state.

---

## 12. Protected Functional Zones

The mobile visual refresh must not change the behavior of:

- Contact import
- Google Contacts
- CSV parsing
- Recipient parsing
- Recipient normalization
- Recipient deduplication
- OAuth
- Session handling
- Permissions
- Order creation
- Payment
- Dispatch
- Solapi integration
- Polling
- Retry dispatch
- Wizard state transitions

If UI and business logic are mixed in the same file, prefer class/style extraction rather than logic refactoring.

---

## 13. Canonical Brand Rules

- Product name is always `PING`
- `PING` is uppercase
- Use the approved PING symbol/wordmark
- Do not introduce a new logo style
- Do not redesign the PING mark inside feature screens
- Keep the application interior cleaner than the surrounding marketing artwork

Floral/funeral imagery may appear in marketing context when needed, but should not dominate core operational screens.

---

## 14. Prohibited Deviations

Without explicit approval, do not:

- Replace the generic device with an iPhone/Galaxy mockup
- Add Dynamic Island/notch/camera hole
- Change the phone frame per section
- Create a dark-mode-only send flow
- Add dense dashboard cards to simple workflow screens
- Replace large status numbers with small captions
- Introduce unrelated gradients, glassmorphism, or 3D panels
- Change core CTA shape screen-by-screen
- Use different mobile typography systems between landing and runtime
- Alter protected business logic while applying the mockup

---

## 15. Implementation Order

1. Place the two canonical reference images in the repository
2. Add this canonical document
3. Identify all current smartphone mockup implementations
4. Create/shared-ize the canonical phone shell
5. Apply it to the landing page
6. Apply it to the actual send flow
7. Apply it to sending / completion / status
8. Verify mobile widths
9. Verify protected logic has no functional diff
10. Lock the result

---

## 16. Mobile Validation Widths

Minimum visual verification:

- 360 px
- 375 px canonical
- 390 px
- 430 px

Check:

- No horizontal overflow
- CTA not clipped
- Long names/numbers remain readable
- Search/input remains usable
- Contact list remains tappable
- Keyboard does not cover critical CTA
- Sending state remains centered and readable
- Completion state does not shift unexpectedly

---

## 17. Lock Condition

This canonical is considered locked when:

- Both reference images exist in the repository
- Landing and runtime use the same mockup language
- The shared phone shell is implemented
- Contact screen matches the canonical visual language
- Sending screen matches the canonical visual language
- Completion/status remain visually consistent
- Protected functional zones have no unauthorized behavior changes
- Mobile responsive checks pass

After lock, desktop/tablet work must adapt around the mobile canonical rather than rewriting it.

---

## 18. Agent Instruction

Every future implementation prompt involving PING mobile UI must include this rule:

> Follow the canonical reference images and PING Mobile Mockup Canonical.
> Do not redesign the smartphone mockup or mobile UI language.
> Reuse the shared phone mockup component.
> Preserve all protected functional logic.

Every future implementation prompt involving PING mobile UI must include this rule.

This sentence is mandatory unless the task explicitly changes the canonical.

---

## 19. Status

**CANONICAL: LOCKED**

Any deviation requires explicit approval before implementation.
