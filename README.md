# GhostWriter 2 👻

An AI-assisted novel writing platform that helps transform ideas into complete novels, chapter by chapter.

## Features

- 📝 **Rich Text Editor** - Full formatting toolbar with Bold, Italic, Underline, Strikethrough, and text alignment
- 📚 **Chapter Management** - Create, rename, delete, and navigate chapters with ease
- 💾 **Auto-Save** - Chapters automatically save as you write
- 🗂️ **Project Management** - Create new novels or open existing ones
- 🤖 **GhostWriter AI** - Integrated AI writing assistant (coming soon)
- 🎨 **Professional Design** - Clean, distraction-free writing environment

## Tech Stack

- **Frontend**: React with TypeScript
- **Desktop**: Electron
- **Styling**: CSS with Intuit brand colors
- **Storage**: Local file system with Markdown files

## Development

```bash
# Clone the repository
git clone https://github.com/asmolowe5/GhostWriter2.git
cd GhostWriter2/ghostwriter2

# Install dependencies
npm install

# Run in development mode
npm run electron-dev

# Build for production
npm run build-electron
```

## File Structure

Novels are saved in `Documents/GhostWriter Novels/[Novel Name]/`:
- `novel.json` - Project metadata
- `chapter-01.md` - Individual chapter files
- `chapter-02.md` - Auto-numbered chapters

## License

MIT

## Author

Built with ❤️ using Claude Code