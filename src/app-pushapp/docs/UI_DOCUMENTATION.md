# PushApp UI Documentation

**Audience:** developers, QA / testers, designers working on `src/app-pushapp`  
**Purpose:** document the **actual** typography, spacing, and component conventions used in the product so new screens stay consistent and regressions are easy to spot.  
**Source of truth:** theme SCSS + Vuetify defaults + recurring page patterns (not design-tool mockups).

> Values assume a **16px root**. Rem → px conversions below use that baseline.

---

## Table of contents

1. [Design system foundations](#1-design-system-foundations)
2. [Typography scale (global)](#2-typography-scale-global)
3. [Page headers & sub-headers](#3-page-headers--sub-headers)
4. [Normal / body text](#4-normal--body-text)
5. [Forms — fields, labels, density](#5-forms--fields-labels-density)
6. [Dropdowns, selects, autocomplete, search](#6-dropdowns-selects-autocomplete-search)
7. [Date pickers](#7-date-pickers)
8. [Buttons & icons](#8-buttons--icons)
9. [Tables (MyDataTable)](#9-tables-mydatatable)
10. [Chips, badges, status](#10-chips-badges-status)
11. [Analytics & dashboards](#11-analytics--dashboards)
12. [Templates](#12-templates)
13. [Campaigns](#13-campaigns)
14. [Cohorts & journeys](#14-cohorts--journeys)
15. [Config & library](#15-config--library)
16. [Loaders & overlays](#16-loaders--overlays)
17. [QA checklist](#17-qa-checklist)
18. [Key source files](#18-key-source-files)

---

## 1. Design system foundations

### Font family

**Primary font:** `Public Sans`

```
"Public Sans", sans-serif, -apple-system, BlinkMacSystemFont,
"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif,
"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"
```

Defined in:

`src/app-pushapp/@core/scss/template/libs/vuetify/_variables.scss`

### Shape & elevation (defaults)

| Token | Value |
|--------|--------|
| Root border radius | `6px` |
| Small radius | `4px` |
| Large radius | `8px` |
| Default button height | `38px` |
| Compact field density | Vuetify `compact` (global defaults) |

### Color emphasis helpers (text)

Use Vuetify semantic classes rather than hard-coded hex where possible:

| Class | Typical use |
|--------|-------------|
| `text-high-emphasis` | Primary readable text, labels |
| `text-medium-emphasis` | Secondary / supporting text |
| `text-disabled` | Disabled / muted captions |
| `text-primary` / `text-error` / `text-success` | Semantic accents (chart titles, validation) |

---

## 2. Typography scale (global)

### Heading & body classes (Vuetify `$typography`)

| Class | Size (rem) | ≈ px | Line-height | Weight | Typical use |
|--------|------------|------|-------------|--------|-------------|
| `text-h1` | `2.375rem` | **38** | `3.25rem` | 500 | Rare in product; marketing/demo typography pages |
| `text-h2` | `2rem` | **32** | `2.75rem` | 500 | Rare in product |
| `text-h3` | `1.625rem` | **26** | `2.25rem` | 500 | Rare in product |
| `text-h4` | `1.375rem` | **22** | `1.875rem` | 500 | **Dashboard page titles** (User / Sequence Analytics) |
| `text-h5` | `1.125rem` | **18** | `1.5rem` | 500 | **Card titles**, section titles, KPI numbers, Event Analytics page title |
| `text-h6` | `0.9375rem` | **15** | `1.3125rem` | ~500 | Section labels inside cards, dialog titles, journey analytics stat values |
| `text-subtitle-1` | `1rem` | **16** | `1.75rem` | 400 | Occasional subtitles |
| `text-subtitle-2` | `0.875rem` | **14** | `1.32rem` | 500 | Dense secondary titles |
| `text-body-1` | `0.9375rem` | **15** | `1.375rem` | 400 | **Default body / card text / field input text** |
| `text-body-2` | `0.8125rem` | **13** | `1.25rem` | 400 | **Field labels**, secondary descriptions, table headers |
| `text-caption` | `0.6875rem` | **11** | `0.875rem` | 400 | Hints, meta under stats, tiny helper text |
| `text-button` | `0.9375rem` | **15** | `1.125rem` | 500 | Button label text (`capitalize`) |
| `text-overline` | `0.75rem` | **12** | — | 500 | Rare overline labels |

### Utility size classes (`text-xs` …)

Generated utilities (template overrides):

| Class | Size | ≈ px | Notes |
|--------|------|------|--------|
| `text-xs` | `0.6875rem` | 11 | Same ballpark as caption |
| `text-sm` | `0.8125rem` | 13 | Same as body-2 — used under KPI labels |
| `text-base` | `0.9375rem` | 15 | Same as body-1 |
| `text-lg` | `1.125rem` | 18 | Same as h5 |

### Quick “what should I use?” map

| Content type | Prefer |
|--------------|--------|
| Page header (dashboard) | `text-h4` or `text-h5` |
| Card / dialog title | Default `VCardTitle` (= h5 **18px**) or `text-h6` for dialogs |
| Section title inside a page | `text-h6` or `text-h5` |
| Normal paragraph / description | `text-body-1` or `text-body-2` |
| Form label above input | `text-body-2 text-high-emphasis` (App* components) |
| Hint / helper under control | `text-caption` |
| Table column header | System table styles → **13px / 500 / uppercase** |
| Table cell data | Body default (~**15px**, medium emphasis color) |

---

## 3. Page headers & sub-headers

### Admin list pages (templates, campaigns, cohorts, journeys, slices, channels, library)

**Pattern:** usually **no large page H1**. Content sits in a `VCard` with a toolbar row.

```
VCard
 └─ VCardText (toolbar: refresh IconBtn + primary “New / Create” button)
 └─ VDivider
 └─ MyDataTable
```

- Toolbar actions: default `VBtn` (height **38px**) or `VBtn icon variant="text"` for refresh  
- Primary CTA label examples: `New`, `Create Template`, `New Campaign`

**Expectation for testers:** list screens look like a card + toolbar + table, not a big title banner.

### Admin add / edit pages

| Pattern | Size | Example |
|---------|------|---------|
| `VCardTitle` / `v-card-title` | **18px** (h5) | Cohort Build/View |
| Push campaign card title | Default card title | “Push Notification” |
| Journey toolbar name fields | Compact `AppTextField` | Untitled Flow |

### Dashboard page headers

| Page | Markup | Size |
|------|--------|------|
| User Analytics | `h2.text-h4.font-weight-medium` | **22px** |
| Sequence Analytics | `h2.text-h4.font-weight-medium` | **22px** |
| Event Analytics | `h3.text-h5` | **18px** |
| Device Analytics sections | `span.text-h6` + icon `22` | **15px** |

### Sub-headers / section titles

| Context | Class | Size |
|---------|-------|------|
| Analytics DAU / MAU section | `text-h6` | 15px |
| Chart card titles (events) | `text-h5 font-weight-bold text-primary` | 18px bold primary |
| Dialog titles (campaign logs, etc.) | `text-h6` | 15px |
| Config “App Credentials” | `text-h5 mb-6` | 18px |

---

## 4. Normal / body text

| Use | Class / token | Size |
|-----|----------------|------|
| Default reading text | `text-body-1` / card text | **15px** |
| Secondary description under titles | `text-body-2` / `text-caption` | **13px** / **11px** |
| Empty-state title in tables | `text-h6` | 15px |
| Empty-state body | `text-body-2 text-medium-emphasis` | 13px |
| Journey audience helper copy | `text-caption` | 11px |

**Do not** invent one-off `font-size: 14px` / `16px` in scoped CSS unless matching an existing local pattern (e.g. Flatpickr custom range buttons use **12px** in analytics).

---

## 5. Forms — fields, labels, density

### Global Vuetify defaults

File: `src/app-pushapp/plugins/vuetify/defaults.js`

| Component | Density | Variant | Color | Details |
|-----------|---------|---------|-------|---------|
| `VTextField` | `compact` | `outlined` | `primary` | `hideDetails: 'auto'` |
| `VSelect` | `compact` | `outlined` | `primary` | same |
| `VAutocomplete` | `compact` | `outlined` | `primary` | same |
| `VCombobox` | `compact` | `outlined` | `primary` | same |
| `VTextarea` | `compact` | `outlined` | `primary` | same |
| `VFileInput` | `compact` | `outlined` | `primary` | same |

### Field text size

Theme: `$field-font-size: 0.9375rem` → **15px** for typed / selected value.

### App* wrapper labels

`AppTextField`, `AppSelect`, `AppAutocomplete`, `AppDateTimePicker`, etc.:

```vue
<VLabel class="mb-1 text-body-2 text-high-emphasis" />
```

| Property | Value |
|----------|--------|
| Label size | **13px** (`text-body-2`) |
| Label weight / color | high emphasis |
| Spacing under label | `mb-1` |
| Control variant | forced `outlined` |

### Validation / errors

- Error message appears under the field (Vuetify details) — typically caption-scale  
- Required fields use shared validators (e.g. `requiredValidator`)  
- Prefer `persistent-hint` + space hint when layout shift must be avoided (campaign name pattern)

---

## 6. Dropdowns, selects, autocomplete, search

### Standard select / autocomplete (forms)

| Aspect | Convention |
|--------|------------|
| Component | `AppSelect` / `AppAutocomplete` / `VSelect` / `VAutocomplete` |
| Density | `compact` |
| Variant | `outlined` |
| Value font | **15px** |
| Label (App*) | **13px** body-2 |
| Menu list item | Default Vuetify list item typography (~body) |
| Clearable | Used when optional (templates, cohorts, events) |

### Search in tables

`MyDataTable` filter row:

| Control | Density | Variant |
|---------|---------|---------|
| Column text search | `compact` | `underlined` |
| Column select filter | `compact` | `underlined` |

**Tester note:** table filters look lighter (`underlined`) than page forms (`outlined`).

### Search / filter outside tables

- Event Analytics event/cohort pickers: `VAutocomplete` `density="compact"` `variant="outlined"`, often `min-width: 200–250px`  
- Analytics month picker: `AppSelect` `density="compact"`, width ~`180px`

### Dropdown option meta

Template option secondary text (e.g. `( simple )`) uses small caption-style helper under the option — keep secondary meta visually quieter than the primary option title.

---

## 7. Date pickers

### Component

`AppDateTimePicker` (Flatpickr under the hood)  
Also used from sibling app packages in some dashboards (`app-tikat` / `app-insights360` wrappers) — visual language should still match Public Sans + outlined field.

### Field appearance

| Aspect | Value |
|--------|--------|
| Label | `text-body-2` (**13px**) when using App wrapper |
| Input text | **15px** |
| Density | compact / outlined (aligned with other fields) |
| Common prepend icon | `tabler-calendar` |
| Range mode | `config.mode: 'range'` |
| Display format (product) | often `d-m-Y` or `Y-m-d` depending on page |

### Calendar popup typography (AppDateTimePicker SCSS)

| Element | Size |
|---------|------|
| Month / year controls | **15px** (`0.9375rem`), weight 500 |
| Weekday headers | **13px** (`0.8125rem`), weight 500 |
| Day cells | **15px** (`0.9375rem`) |

### Range selection behaviour (product convention)

- Reload / fetch typically on **close** when **both** dates selected (`onClose` / `selectedDates.length === 2`)  
- Journey analytics sends **epoch ms**: from = start of day `00:00:00.000`, to = end of day `23:59:59.999`, while UI still shows **dates only**

### Local overrides to know

| Location | Note |
|----------|------|
| Device analytics | Flatpickr custom preset buttons **12px** |
| Campaign list date range | Width often ~`250px` |
| Journey analytics | Width constrained ~`270–350px` next to KPI cards |

---

## 8. Buttons & icons

### Default button

| Property | Value |
|----------|--------|
| Height | **38px** |
| Label | **15px**, weight 500, capitalize |
| Color default | `primary` |
| Icon size in default btn | ~**18px** (theme multiplier) |

### Common variants in product

| Pattern | Props | Where |
|---------|-------|--------|
| Primary CTA | default `VBtn` + `prepend-icon` | List “New / Create” |
| Refresh | `VBtn icon variant="text"` | List toolbars |
| Secondary / exit | `variant="tonal" color="secondary"` | Forms |
| Dense action | `size="small"` | Campaign actions, library add |
| Extra dense chip-like | `size="x-small"` | Platform chips |
| Table actions | `IconBtn` + `VIcon` | All admin tables |

### IconBtn (table / toolbar icons)

Defaults (Vuetify plugin):

| Property | Value |
|----------|--------|
| `icon` | `true` |
| `variant` | `text` |
| `density` | `comfortable` |
| Nested `VIcon` size | **22** |

### Avatar icons in KPI cards

`CardStatisticsTransactions`: avatar **42**, `variant="tonal"`.

---

## 9. Tables (MyDataTable)

**Component:** `src/@common/components/vuexy/MyDataTable.vue`  
Used across pushapp admin lists (templates, campaigns, journeys, cohorts, channels, library, slices).

### Dimensions

| Token | Value |
|--------|--------|
| Header row height | **48px** |
| Body row height | **56px** |
| Wrapper min-height (component) | **300px** (some pages override lower) |

### Header typography

From `template/_components.scss` `.v-table th`:

| Property | Value |
|----------|--------|
| Font size | **13px** (`0.8125rem`) |
| Font weight | **500** |
| Letter spacing | `0.0625rem` |
| Transform | **uppercase** |
| Color | high emphasis |

### Body / cell data

| Property | Convention |
|----------|------------|
| Font size | default body (~**15px**) |
| Color | medium emphasis |
| Wrap | `text-no-wrap` on table root (ellipsis patterns on long desc cells) |

### Sorting

- Column sort indicators follow Vuetify data table defaults  
- Server-side lists pass `sortBy` into store fetch APIs  
- **Tester:** sorted column header remains uppercase 13px; only icon/state changes

### Search / filters in header

| Element | Density | Variant | Font |
|---------|---------|---------|------|
| Text filter | compact | underlined | field **15px** |
| Select filter | compact | underlined | field **15px** |

### Pagination

Default options: **10 / 25 / 50 / 100** items per page.

### Empty / loading

| State | UI |
|-------|-----|
| Loading | spinner size **32** |
| Empty icon | size **64** |
| Empty title | `text-h6` |
| Empty message | `text-body-2 text-medium-emphasis` |

---

## 10. Chips, badges, status

| Pattern | Props | Notes |
|---------|-------|--------|
| Status in tables | `VChip variant="tonal" size="small"` | Journey / campaign status |
| Global chip default | `size: 'small'` in Vuetify defaults | Prefer small unless mocked otherwise |
| View-only badge (journey builder) | custom ~**9px** uppercase pill | Flow editor sidebar only |

Status colour mapping (journeys — example):

| Status | Chip colour |
|--------|-------------|
| DRAFT | secondary |
| ON_GOING (Live) | success |
| PAUSED | warning |
| ENDED | error |

---

## 11. Analytics & dashboards

### Shared KPI card — `CardStatisticsTransactions`

| Element | Class / size |
|---------|----------------|
| Card title | VCard title → **18px** h5 |
| Metric value | `text-h5 font-weight-medium` → **18px** |
| Metric label | `text-sm` → **13px** |
| Icon avatar | **42** tonal |

Used on:

- Device Analytics (DAU / MAU)  
- Campaign list summary cards (“Count”, “Stats”)  
- Event Snap Overview  

### Device Analytics (`pages/dashboards/analytics.vue`)

| Element | Convention |
|---------|------------|
| DAU / MAU section title | `text-h6` + icon 22 |
| Month filter | `AppSelect` compact ~180px (MAU only) |
| Chart title | “Device Statistics” via chart component |
| Loaders | **Per-section** circular overlays (MAU block, chart) — not one full-page spinner |

### Event Analytics (`pages/dashboards/events.vue`)

| Element | Convention |
|---------|------------|
| Page title | `text-h5` (**18px**) |
| Mode toggle | `VBtnToggle` text buttons with Tabler icons |
| Snap Overview | `CardStatisticsTransactions` + circular overlay while loading |
| Chart section titles | `text-h5 font-weight-bold text-primary` |

### Sequence Analytics

| Element | Convention |
|---------|------------|
| Page title | `text-h4` (**22px**) |
| Chart bar labels (canvas) | custom draw — Count / Avg; Count uses `toLocaleString` commas |
| Detail titles | `text-h5 font-weight-bold text-primary` |

### Journey Analytics (flow view)

| Element | Convention |
|---------|------------|
| Summary KPI cards | tonal `VCard`, label `text-caption`, value `text-h6 font-weight-bold` |
| Date range | single range `AppDateTimePicker` |
| Loaders | circular overlay on **stats + datepicker together**; separate overlay on **flow canvas** |
| Node badges | small pills above nodes (~11px bold) with tooltips |

---

## 12. Templates

### Push templates & In-app templates — list

- Same admin list shell (no page H1)  
- CTA: **Create Template**  
- Table headers: uppercase **13px**  
- Row actions: `IconBtn` (eye / edit / delete) icon **22**

### Template add / edit

- Form fields: App* outlined compact, labels **13px**, values **15px**  
- Preview / device frames may use local CSS — prefer not to copy those sizes into admin chrome  
- Dialogs / steppers use `text-h6` or default card titles

**Tester focus:** template lists should match cohorts/journeys list density; form labels should match campaign forms.

---

## 13. Campaigns

### Push & App-engagement campaign lists

| Element | Convention |
|---------|------------|
| Summary cards | `CardStatisticsTransactions` (“Count”, “Stats”) |
| Date range filter | `AppDateTimePicker` range, ~250px |
| Table | MyDataTable standards |
| Dialog titles | `text-h6` |
| Status chips | small tonal |
| Primary CTA | “New Campaign” (may force height **45px** on push list — local override) |

### Campaign add / view

| Element | Convention |
|---------|------------|
| Tabs | Details / Audience / Scheduling |
| Audience mode toggle | `VBtnToggle` compact |
| Filters | `FilterBuilder` / `FilterItem` — field classes with max-widths (type ~180px, field ~220px, operator ~140px) |
| Schedule radios + date/time | AppDateTimePicker + body text |
| Template dropdown | `AppAutocomplete` with option meta caption |

**Audience / filter builder note for QA:** dropdown option lists and nested groups follow the same AppSelect/AppAutocomplete typography; Event Property visibility depends on Custom Event above (including inside groups).

---

## 14. Cohorts & journeys

### Cohorts

| Screen | Header | Notes |
|--------|--------|-------|
| List | Untitled card shell | CTA “New” |
| Add/View | `v-card-title` “Build/View Cohort” | **18px** |
| Filter | `FilterBuilder` with `showScannedEvents` (Once / All) on cohorts only | Scanned Events select ~150px |

### Journeys

| Screen | Header / UI | Notes |
|--------|-------------|-------|
| List | Untitled shell | Status chips small tonal; analytics action icon |
| Builder toolbar | Compact name + description fields | No giant H1 |
| Tabs | Audience / Flow (`text` via VTabs) | Pill style `v-tabs-pill` |
| Flow editor sidebar title | custom **13px** bold | Journey Builder |
| Flow node body | ~**12px** | Custom flow-editor CSS |
| Flow controls | Vue Flow Controls + fullscreen | Zoom + maximize |

---

## 15. Config & library

### API credentials / channels-style config

- Section title: `text-h5 mb-6` → **18px** (“App Credentials”)

### Library list

- No page title; toolbar + `MyDataTable`  
- Actions: `IconBtn`

### Library add

- Inline titles: `text-h6 font-weight-medium` (**15px**)  
- Actions: `VBtn size="small"`

---

## 16. Loaders & overlays

Preferred modern pattern (do not regress to only a full-page blocker when section loaders exist):

| Area | Pattern |
|------|---------|
| Event Snap Overview | Faint overlay + `VProgressCircular` size ~40 |
| Device Analytics MAU | Section overlay on MAU stats |
| Device Analytics chart | Section overlay on chart |
| Journey analytics KPIs + date | One overlay covering both |
| Journey flow canvas | Separate overlay while journey fetch runs |

Overlay look:

- `background: rgba(255,255,255,0.45)`  
- light blur  
- centered circular spinner `color="primary"`

---

## 17. QA checklist

Use this when reviewing a new screen or a visual bug:

### Typography

- [ ] Page title uses **h4 (22)** or **h5 (18)** — not a random px  
- [ ] Card titles read as **18px**  
- [ ] Body copy is **15px** or **13px**, captions **11px**  
- [ ] Form labels are **13px** high-emphasis above outlined fields  

### Forms & pickers

- [ ] Fields are **outlined + compact**  
- [ ] Date range shows **dates only** in the input when product expects date-only  
- [ ] Calendar month/year ~15px, weekdays ~13px  

### Tables

- [ ] Headers uppercase **13px / medium weight**  
- [ ] Row height feels ~56px  
- [ ] Filters are **underlined compact**, not outlined  
- [ ] Action icons ~**22px**  

### Analytics

- [ ] KPI values **18px**, labels **13px** (CardStatisticsTransactions)  
- [ ] Chart titles **18px bold primary** where that pattern is used  
- [ ] Loaders are **section-scoped** where implemented  

### Consistency across modules

- [ ] Templates / campaigns / cohorts / journeys **list shells** look the same family  
- [ ] No new one-off font families (always Public Sans)  

---

## 18. Key source files

| Topic | Path |
|-------|------|
| Typography map / font family | `src/app-pushapp/@core/scss/template/libs/vuetify/_variables.scss` |
| Table / component SCSS | `src/app-pushapp/@core/scss/template/_components.scss` |
| Size utilities | `src/app-pushapp/@core/scss/base/_utils.scss` + template `_variables.scss` |
| Vuetify component defaults | `src/app-pushapp/plugins/vuetify/defaults.js` |
| App form wrappers | `src/app-pushapp/@core/components/app-form-elements/` |
| Date picker styles | `AppDateTimePicker.vue` (same folder) |
| Data table | `src/@common/components/vuexy/MyDataTable.vue` |
| KPI cards | `src/app-pushapp/views/dashboards/event/CardStatisticsTransactions.vue` |
| Typography demos | `src/app-pushapp/views/pages/typography/` |

---

## Appendix A — Size cheat sheet (print-friendly)

```
Caption / xs .......... 11px
Body-2 / sm / table th  13px
Body-1 / h6 / buttons . 15px
H5 / card title / KPI . 18px
H4 / dash page title .. 22px
H3 .................... 26px
H2 .................... 32px
H1 .................... 38px

Button height ......... 38px (default)
IconBtn icon .......... 22px
KPI avatar ............ 42px
Table header height ... 48px
Table row height ...... 56px
```

---

## Appendix B — Module → header pattern matrix

| Module | List header | Detail / add header |
|--------|-------------|---------------------|
| Push templates | None (card toolbar) | Card / form titles (h5) |
| In-app templates | None | Card / form titles (h5) |
| Push campaigns | None + KPI cards | Tabbed card title |
| In-app campaigns | None + similar | Tabbed / audience sections |
| Cohorts | None | `VCardTitle` Build/View |
| Journeys | None | Toolbar fields + tabs |
| Channels | Often text-h5 section | Form titles |
| Library | None | `text-h6` sections |
| Device analytics | Section `text-h6` | Chart component title |
| Event analytics | Page `text-h5` | Chart `text-h5` bold primary |
| Sequence analytics | Page `text-h4` | Chart `text-h5` bold primary |

---

*Document generated from the PushApp codebase conventions. When theme variables change, update this file in the same PR as the SCSS change.*
