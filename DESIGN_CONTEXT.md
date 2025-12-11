This design document outlines the UI for "Haus-sita," focusing on a calming, minimal aesthetic where color serves a specific functional purpose. The design is intended to be implemented using Angular components, favoring clean separation of concerns and responsive CSS (e.g., CSS Grid/Flexbox).

1. Design Foundations
   Typography
   We will use Inter. It is clean, modern, highly legible at small sizes, and has a neutral tone that fits the "calm" requirement.

H1 (Page Titles): Inter, Semi-Bold (600), 24px, Dark Charcoal

H2 (Section Headers): Inter, Medium (500), 18px, Dark Charcoal

Body/Task Title: Inter, Regular (400), 16px, Charcoal

Secondary/Metadata (Effort, Dates): Inter, Regular (400), 14px, Medium Gray

Color Palette
The palette is intentionally restrained. Backgrounds are near-white to maximize "breathing room." Strong colors are reserved strictly for priority and user identification.

Neutral Base:

Background (App): #FAFAFA (An extremely light gray/warm white)

Background (Cards/Containers): #FFFFFF (Pure White)

Text Primary: #2D3748 (Deep Charcoal - softer than pure black)

Text Secondary: #6B7280 (Medium Gray)

Borders/Dividers: #E5E7EB (Very Light Gray)

Functional Priority Colors (The "Color Strips"):

High (Red/Pink): #F87171 (Soft, not alarming)

Medium (Amber): #FBBF24 (Warm and visible)

Low (Mint): #34D399 (Calm, encouraging)

None (Neutral): #D1D5DB (Blends into the background)

User Ownership Accents (Example Couple):

User A Accent: #818CF8 (Soft Indigo)

User B Accent: #2DD4BF (Soft Teal)

2. Core Components (Angular Ready)
   These components are the building blocks used across all views.

A. The Task Card Component (<app-task-card>)
This is the fundamental atom of the interface. It must look actionable and lightweight.

Container: A white rectangle, pure white background (#FFFFFF), 1px border (#E5E7EB), 6px border-radius. No shadow by default (to keep it calm). Subtle hover state: very soft shadow (box-shadow: 0 2px 4px rgba(0,0,0,0.05)).

Priority Strip: A 5px wide solid color bar on the absolute left edge, spanning the full height of the card. Color determined by priority input.

Layout (Flex Row):

Checkbox: A simple circular outline #D1D5DB. Clicking fills it with a soft green checkmark.

Content Block (Flex Column):

Top Row: [Task Title] + [User Dot (if assigned)]. The User Dot is a 8px diameter circle in the user's accent color, placed 8px to the right of the title.

Bottom Row: [Effort (e.g., "15m")] + [Optional Due Date/Context info]. All in secondary gray text.

B. Category Chip Component (<app-category-chip>)
Used for filtering in rooms or tagging.

Pill shape (fully rounded corners).

Background: #F3F4F6 (Light gray).

Text: Medium Gray.

Active State: Background becomes slightly darker (#E5E7EB) and text becomes Charcoal.

C. Progress Bar Component (<app-progress-bar>)
Used in Project views.

Track height: 4px (very slim).

Track color: #E5E7EB.

Fill color: A calming green #34D399 or the user's accent color.

Label: "4/10 completed" in small gray text above the bar.

D. Buttons
Minimalist. Ghost buttons for secondary actions (gray text, no border).

Primary buttons (e.g., "Add Task") have a soft background color (like the Low Priority Mint or a neutral gray) with dark text, and rounded corners. Avoid aggressive "Call To Action" colors.

3. Views Layouts
   View 1: Today View (Dashboard)
   Tone: Reassuring greeting, clear immediate next steps.

Header: "Good morning, [Name]."

Top Right Summary: A subtle text element: "Today's plan: ~3h 15m total effort."

Structure (Responsive Flex Column): Three distinct vertical sections stacked with ample whitespace between them.

Section 1: "Your Tasks" (H2 Header)

List of <app-task-card> components assigned to the current user, sorted by priority.

Section 2: "Partner's Tasks" (H2 Header)

Similar list, visually distinct only by the different "User Dots" on the cards.

Section 3: "Together" (H2 Header)

Tasks assigned to both or unassigned household tasks due today.

View 2: Inbox View
Tone: A clean slate for brain-dumping.

Header: "Inbox"

Add Task Input (Top): A large, clean input field spanning the width. Placeholder: "What needs doing?". Pressing Enter adds it instantly to the list below with default "None" priority.

The List: A single column stack of <app-task-card> elements.

Triage Interaction: On desktop hover (or mobile swipe gesture), reveal quick-action icon buttons on the right side of the card:

[Icon: Calendar] -> "Move to This Week"

[Icon: User] -> "Assign Owner"

[Icon: Tag] -> "Set Priority"

View 3: Weekly Planner
Tone: High-level view, balancing load.

Structure (Desktop - CSS Grid): A 7-column grid (Mon-Sun).

"This Week Bucket" (Top Section): A horizontal container above the grid holding tasks designated for the week but not yet assigned a day. Drag-and-drop from here to the days below.

Daily Columns:

Header: Day Name + Date (e.g., "Mon 12"). Today's column header has a subtle mint green text highlight.

Overload Indicator: Below the date header, a subtle text line: "Est: 2h". If the sum exceeds a set threshold (e.g., 4h), this text turns amber and a small warning icon appears.

Body: A vertical stack of <app-task-card>s for that day.

Mobile Adaptation: The 7-column grid collapses into a vertical list of days. Each day is an expandable accordion containing its tasks.

View 4: Category / Room View
Tone: Focused browsing.

Header: "Browse Rooms"

Navigation: A horizontal scrolling list of <app-category-chip>s at the top (Kitchen, Living, Bath, Admin, Finance).

Controls (Top Right): A simple toggle switch: "Show completed".

Body: A standard list of <app-task-card>s belonging to the selected category. Time/date info is secondary here; the focus is on what the task is.

View 5: Project Detail View
Tone: Breaking down a big goal.

Header (H1): [Project Title] (e.g., "Spring Pantry Reorganization")

Description: Gray text below title explaining the goal.

Progress Section: An <app-progress-bar> showing subtask completion status.

Subtasks Header (H2): "Checklist"

Body: A list of <app-task-card>s.

Footer: An "Add subtask..." inline input field at the bottom of the list.