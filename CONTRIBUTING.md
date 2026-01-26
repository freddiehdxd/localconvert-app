# Contributing to LocalConvert

Thank you for your interest in contributing to LocalConvert! This document provides guidelines and instructions for contributing.

## License Notice

LocalConvert is **source-available** for personal and research use only. By contributing, you agree that your contributions will be licensed under the same terms as the project (see [LICENSE](LICENSE)).

## Ways to Contribute

### Reporting Bugs

If you find a bug, please open an issue with:

- A clear, descriptive title
- Steps to reproduce the issue
- Expected behavior vs. actual behavior
- Your environment (Windows version, tool versions)
- Screenshots or error messages if applicable

### Suggesting Features

Feature requests are welcome! Please open an issue with:

- A clear description of the feature
- Why this feature would be useful
- Any implementation ideas you have

### Code Contributions

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/your-feature-name`)
3. **Make your changes**
4. **Test your changes** thoroughly
5. **Commit with clear messages** (see commit guidelines below)
6. **Push to your fork** (`git push origin feature/your-feature-name`)
7. **Open a Pull Request**

## Development Setup

### Prerequisites

- [Rust](https://rustup.rs/) (latest stable)
- [Node.js](https://nodejs.org/) v18 or later
- [FFmpeg](https://ffmpeg.org/) and [ImageMagick](https://imagemagick.org/) for testing

### Getting Started

```bash
# Clone your fork
git clone https://github.com/freddiehdxd/localconvert-app.git
cd localconvert-app

# Install dependencies
npm install

# Run in development mode
npm run tauri dev
```

## Code Guidelines

### Frontend (TypeScript/React)

- Use TypeScript strict mode
- Follow existing code style and patterns
- Use Zustand for state management (see `src/store/useStore.ts`)
- Use Framer Motion for animations
- Use Tailwind CSS for styling
- Keep components focused and reusable

### Backend (Rust/Tauri)

- Follow Rust conventions and idioms
- Add error handling with descriptive messages
- Document public functions
- Keep commands in `src-tauri/src/commands.rs`
- Keep conversion logic in `src-tauri/src/converter.rs`

### Commit Messages

Use clear, descriptive commit messages:

```
feat: add HEIC to PNG conversion support
fix: resolve progress bar not updating for large files
docs: update installation instructions
refactor: simplify video trimmer state management
```

Prefixes:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

## Pull Request Guidelines

- Keep PRs focused on a single feature or fix
- Update documentation if needed
- Ensure no linter errors or warnings
- Test on Windows before submitting
- Provide a clear description of changes

## Project Structure

```
localconvert/
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── store/              # Zustand store
│   ├── hooks/              # Custom hooks
│   ├── types/              # TypeScript types
│   └── utils/              # Utility functions
├── src-tauri/              # Rust backend
│   └── src/
│       ├── commands.rs     # Tauri commands
│       ├── converter.rs    # Conversion logic
│       ├── tools.rs        # Tool detection
│       └── types.rs        # Rust types
└── public/                 # Static assets
```

## Questions?

If you have questions about contributing, feel free to open an issue with the "question" label.

Thank you for helping make LocalConvert better!
