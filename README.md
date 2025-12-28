# Sticky Notes Whiteboard

A feature-rich digital sticky notes application built with vanilla JavaScript, HTML, and CSS. Create, organize, and visualize your notes with multiple sheets, custom colors, and connection lines.

## Features

### Core Functionality
- **Create & Edit Notes** - Add sticky notes to your board and edit text in real-time
- **Multiple Sheets** - Organize notes into different sheets (create, rename, delete, and switch between them)
- **Persistent Storage** - All notes and sheets are automatically saved to browser's localStorage
- **Drag & Resize** - Move and resize notes freely on the board
- **Custom Colors** - Choose from 5 color options: Yellow, Pink, Green, Blue, and Peach

### Advanced Features
- **Connect Notes** - Draw connection lines between notes to visualize relationships
- **Dark Mode** - Toggle between light and dark themes for comfortable viewing
- **Multiple Sheet Sizes** - Switch between Small, Medium, Large, Biggest, and Excel-sized sheets
- **Bulk Conversion** - Convert all "Biggest" sized sheets to Excel format at once
- **Export Options** - 
  - Export current sheet as JSON
  - Export current sheet as PDF
  - Convert sheets to Excel-compatible sizes

### Interface Controls
- **Sheet Picker** - Dropdown to select between different sheets
- **New Sheet** - Create a blank sheet
- **Rename/Delete** - Manage sheet names and delete sheets
- **Size Control** - Adjust the working area size
- **Clear All** - Remove all notes from the current sheet
- **Remove Knot** - Delete connection lines between notes

## Getting Started

### Prerequisites
No server or special dependencies required - just a modern web browser.

### Installation
1. Clone or download the repository
2. Ensure these files are in the same directory:
   - `index.html`
   - `script.js`
   - `style.css`
3. Open `index.html` in your web browser

### Usage
1. **Add Notes** - Click the "Add Note" button to create a new sticky note
2. **Edit** - Click on a note to edit its text
3. **Move & Resize** - Drag notes around, resize by dragging the bottom-right corner
4. **Change Color** - Select a color from the dropdown and click "Add Note" to create colored notes, or use on existing notes
5. **Manage Sheets** - Use the sheet controls to organize your notes into multiple sheets
6. **Connect Notes** - Click "🔗" button to enter connect mode, then click two notes to draw a connection
7. **Dark Mode** - Click the "🌙" button to toggle dark mode
8. **Export** - Use Export buttons to save your work as JSON or PDF

## Files Structure

- **index.html** - Main HTML structure with header controls and note template
- **script.js** - Core JavaScript functionality (613 lines)
  - Sheet management (create, load, save, switch)
  - Note creation, editing, deletion
  - Drag and resize functionality
  - Connection line drawing
  - LocalStorage persistence
  - Export/import features
- **style.css** - Responsive styling with dark mode support

## Technical Details

### Data Storage
- Notes are stored in browser's `localStorage` with keys: `sticky_notes_v1_[sheetId]`
- Sheet metadata stored in `sticky_sheets_v1`
- Connection data stored in `sticky_notes_connections_v1`

### Browser Support
Works on all modern browsers that support:
- ES6 JavaScript
- CSS Grid and Flexbox
- LocalStorage API
- HTML5 Canvas (for PDF export)

## Keyboard Shortcuts
- Notes can be edited by clicking on them
- Escape key typically exits edit mode

## Data Persistence
Your notes are automatically saved to your browser's localStorage. Clearing browser data will delete all notes and sheets.

## Limitations
- Storage is limited to browser's localStorage capacity (~5-10MB per domain)
- Data is browser/device-specific (not synced across devices)
- Clearing browser data will delete all saved notes

## Future Enhancements
Potential features for future versions:
- Cloud sync across devices
- Collaborative editing
- Templates for common note types
- Note categories/tagging
- Search functionality
- Keyboard shortcuts guide
- Import from other note apps

## License
This project is open source and available for personal and commercial use.

---

**Created:** December 28, 2025
