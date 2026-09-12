# PING UI Lock

Status: LOCKED  
Canonical viewport: `375px`

Follow the canonical reference images and PING Mobile Mockup Canonical.
Do not redesign the smartphone mockup or mobile UI language.
Reuse the shared phone mockup component.
Preserve all protected functional logic.

---

## Canonical Brand Asset

- Runtime: `public/brand/ping/ping-app-logo-canonical.png`
- Docs: `docs/references/ping-brand/ping-app-logo-canonical.png`

The approved PING logo is a locked canonical brand asset. Do not recreate, reinterpret, or replace the PING symbol or wordmark without explicit approval.

## Locked References

- `docs/references/ping-brand/ping-app-logo-canonical.png`
- `docs/references/ping-mobile/ping-mobile-contacts-canonical.png`
- `docs/references/ping-mobile/ping-mobile-sending-canonical.png`
- Spec: `docs/PING_MOBILE_MOCKUP_CANONICAL.md`

## Locked Component

- `PhoneMockup` — `src/components/ping-mobile/phone-mockup.tsx`
- Screen grammar — `src/components/ping-mobile/ping-mobile-screens.tsx`
- Tokens — `src/components/ping-mobile/phone-mockup.css`
- Landing adapter — `src/components/intro/PhoneDeviceFrame.tsx` (wrapper only)

## Locked Visual Tokens

| Token | Value |
|-------|--------|
| Primary | `#0056F3` (`--ping-primary`) |
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
| Logical width | `375px` |

Do not introduce a second primary blue. Cyan accent remains optional and is not sending-state chrome.

## Locked Screens

| Screen | Landing | Runtime |
|--------|---------|---------|
| Contacts | `PingMobileContactsScreen` in `HeroPhoneFan` | `/start` pick + recipient exclude modal classes |
| Sending | `PingMobileSendingScreen` in PhoneFlow + fan | `/payment-success` dispatching (`chrome={false}`) |
| Completion | `PingMobileCompletionScreen` | `/payment-success` complete (`chrome={false}`) |
| Status | same grammar, counts from fulfillment | order card remains detail, not a dashboard |

## Protected Logic

Do not change behavior of Google Contacts, CSV/xlsx/vcf parsing, recipient normalization, OAuth, `ping_bulk_*` session keys, order create/status, payment, dispatch, Solapi, retry, polling, or wizard transitions.

## Future Rule

향후 agent는 Mobile Canonical을 새로 디자인하지 않는다.

Desktop / tablet work must derive from this locked mobile system. Do not change mobile DOM or spacing to satisfy desktop.
