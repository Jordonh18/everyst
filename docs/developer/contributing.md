# Contributing Guidelines

Thank you for your interest in contributing to Everyst! This document provides guidelines for contributing to the project.

## Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct:

- Be respectful and inclusive
- Be constructive in feedback and discussions
- Focus on what is best for the community
- Show empathy toward other community members

## Getting Started

### Setting Up Development Environment

Before you begin, set up your development environment:

1. Fork the repository on GitHub
2. Clone your fork locally
3. Follow the [Development Environment Setup Guide](./setup.md)

### Finding Issues to Work On

- Check the [Issues](https://github.com/Jordonh18/Everyst/issues) tab on GitHub
- Issues labeled `good-first-issue` are great for new contributors
- Issues labeled `help-wanted` are actively seeking contributions

If you want to work on something not listed, please open an issue first to discuss.

## Development Workflow

### Creating a Branch

Create a branch for your work with a descriptive name:

```bash
git checkout -b feature/descriptive-feature-name
# or
git checkout -b fix/issue-description
```

### Making Changes

1. Make your changes in the branch
2. Keep changes focused on one specific task or fix
3. Write clean, well-commented code
4. Follow the code style guidelines

### Code Style Guidelines

#### Python (Backend)

- Follow [PEP 8](https://www.python.org/dev/peps/pep-0008/) style guidelines
- Use docstrings for functions and classes
- Use type hints where possible
- Keep functions focused and concise

#### TypeScript/React (Frontend)

- Follow the ESLint and Prettier configurations
- Use TypeScript interfaces for props and state
- Use functional components with hooks
- Organize imports by: built-in, external, internal
- Use proper component structure:
  - Props interface
  - Hooks
  - Helper functions
  - Return JSX

### Testing Your Changes

1. Write tests for your code changes
2. Run the appropriate test suite:
   ```bash
   # Backend tests
   cd backend
   python manage.py test

   # Frontend tests
   npm test
   ```
3. Ensure all existing tests pass

### Documentation

Update documentation to reflect your changes:

- Update docstrings for changed functions
- Update API documentation for endpoint changes
- Add component documentation for new components
- Update user guides if features change behavior

## Submitting Changes

### Committing Your Changes

Make logical, atomic commits with clear messages:

```bash
git add .
git commit -m "feat: add network device grouping feature"
```

Follow the [Conventional Commits](https://www.conventionalcommits.org/) format:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `style:` for code style changes (formatting, etc.)
- `refactor:` for code refactoring
- `test:` for adding or fixing tests
- `chore:` for build, tooling, or dependency updates

### Creating a Pull Request

1. Push your branch to your fork:
   ```bash
   git push origin feature/your-feature
   ```

2. Go to the original repository on GitHub and create a Pull Request

3. Fill in the PR template with:
   - Description of changes
   - Related issue(s)
   - Screenshots if applicable
   - Testing performed
   - Checklist of completed items

### PR Review Process

1. Automated checks will run on your PR
2. Maintainers will review your code
3. You may need to make requested changes
4. Once approved, a maintainer will merge your PR

## Additional Guidelines

### Reporting Bugs

When reporting bugs:

1. Use the bug report template
2. Include clear steps to reproduce
3. Include expected and actual behavior
4. Include screenshots if relevant
5. Include browser/OS info if frontend-related

### Suggesting Features

When suggesting features:

1. Use the feature request template
2. Clearly describe the problem the feature solves
3. Suggest an approach if you have one in mind
4. Consider providing mockups for UI features

### Security Vulnerabilities

For security vulnerabilities, please do NOT file a public issue. Instead:

1. Email the maintainers directly
2. Provide details of the vulnerability
3. Allow time for the issue to be addressed before disclosure

## Project Structure

Understanding the project structure helps make effective contributions:

- See the [Code Structure](./code-structure.md) documentation for detailed information

## Key Technical Decisions

When contributing, be aware of these important architectural decisions:

### Backend

- Django REST Framework for APIs
- Socket.IO for real-time communication
- Role-based permission system
- Domain-driven model organization

### Frontend

- React functional components (no class components)
- TypeScript for type safety
- React Context for state management
- Tailwind CSS for styling

## Getting Help

If you need help:

- Ask questions in the issue related to your contribution
- Comment on relevant code sections with questions
- Join the project's community channels (coming soon)

## Review Criteria

Pull requests are evaluated based on:

1. Correctness: Does it work as intended?
2. Code quality: Is it well-written and maintainable?
3. Test coverage: Are there tests for the changes?
4. Documentation: Are the changes documented?
5. Fit: Does it align with project goals and architecture?

## Recent Updates

### Authentication System Enhancement

The authentication system has been enhanced to support flexible login options:

- **Username/Email Login**: Users can now log in using either their username or email address
- **Case-Insensitive**: Both username and email matching are case-insensitive
- **Enhanced UI**: Username is now more visible in user interfaces
- **Backward Compatible**: All existing functionality is preserved

For detailed information, see [Authentication Updates Documentation](authentication-updates.md).

## Licensing

By contributing to Everyst, you agree that your contributions will be licensed under the project's [GPL-3.0 License](../LICENSE).

## Thank You!

Your contributions help make Everyst better for everyone. We appreciate your time and effort!
