# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome/browser extension called "Oprosnik Helper" (version 4.0.0) that assists with filling out surveys by automatically copying data from Cisco Finesse. The extension is designed for internal use at RT (Rostelecom) and integrates with their CTP survey system.

## Architecture

The extension follows Chrome Extension Manifest V3 architecture with these core components:

### Background Service Worker (`background.js`)
- **Primary Function**: Active monitoring of Cisco Finesse agent status and call data
- **Key Class**: `FinesseActiveMonitor` - monitors agent status changes and captures call data
- **Monitoring Strategy**: 
  - Status checks every 3 seconds via alarms
  - Active call monitoring every 1 second during calls
  - Post-call capture with enhanced monitoring after call completion
- **Data Storage**: Uses `chrome.storage.local` for call history and agent status
- **Host**: Monitors `https://ssial000ap008.si.rt.ru:8445/desktop/container/*`

### Content Scripts
1. **Form Modifier (`form-modifier.js`)**: 
   - Hides unnecessary form fields on survey pages
   - Removes specific options from dropdown lists
   - Targets survey forms on `https://ctp.rt.ru/quiz*`

2. **Filler (`filler.js`)**:
   - Creates "Вставить данные о звонке" button on survey pages
   - Communicates with background worker to get call data
   - Shows call history modal for selection when multiple calls exist
   - Provides localStorage fallback mechanism

3. **Parser (`parser.js`)**:
   - Minimal script for Finesse pages
   - Provides visual indicator of extension activity
   - Responds to ping requests from background worker

### Key Data Flow
1. Background worker monitors Finesse for agent status changes
2. When call starts (status = "Разговор"), begins active data capture
3. When call ends (status = "Завершение"), performs enhanced post-call capture
4. Call data includes: phone number, duration, region, timestamps
5. Data is stored in call history (max 10 calls) in chrome.storage
6. Survey pages can request and display this data via the filler script

## Extension Permissions
- `alarms`: For periodic monitoring
- `storage`: Call history and settings
- `tabs`: Tab management and detection
- `scripting`: Content script injection
- `notifications`: User notifications
- Host permissions for CTP and Finesse domains

## Key Files to Understand
- `manifest.json`: Extension configuration and permissions
- `background.js:25-100`: Core monitoring logic initialization
- `background.js:103-211`: Data extraction and processing functions
- `filler.js:340-412`: Main button click handler and data retrieval
- `filler.js:82-197`: Call history modal UI

## Development Notes
- No package.json exists - this is a pure browser extension
- No build process required - direct file deployment
- Extension loads content scripts automatically based on URL patterns
- All logging uses console with emoji prefixes for easy debugging
- Uses Chrome Extension APIs exclusively (not web APIs)

## Testing the Extension
1. Load extension in Chrome developer mode
2. Navigate to Finesse URL to activate monitoring
3. Navigate to CTP survey URL to test form modifications and data insertion
4. Check browser console for detailed logging with emoji indicators
5. Use `debugOprosnikHelper()` function in console for diagnostics