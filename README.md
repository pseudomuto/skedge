# skedge

[![CI](https://github.com/pseudomuto/skedge2/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/pseudomuto/skedge2/actions/workflows/ci.yml)

A browser-based schedule generator for schools. Give it your classes, teachers, and time blocks - it figures out a valid
weekly schedule so no teacher is double-booked and every subject gets the right number of sessions.

## What it does

Schools often split classes into smaller cohorts that rotate through different subjects across the week. Coordinating
which teacher covers which cohort in which block - without conflicts - is tedious to do by hand. skedge automates that.
You describe your setup once, hit Generate, and get a full Mon-Fri schedule.

Everything runs in your browser. No account, no server, no data leaves your device.

## Concepts

- **Block** - a named time slot in the school day (e.g. "Period 1", "Morning Block")
- **Subject** - a course or activity (e.g. "Math", "Art")
- **Class** - a group of students divided into **cohorts** that rotate through subjects independently
- **Teacher** - a staff member with a room assignment and a list of subjects they can teach, per class

## Using skedge

Work through the three tabs in order:

**1. Config**

Set up your blocks, subjects, and classes. For each class, add its cohorts and specify which subjects they need and how
many blocks per week each subject requires.

**2. Teachers**

Add each teacher, assign them a room, and specify which subjects they can teach for each class.

**3. Schedule**

Click Generate. skedge will find a valid schedule or tell you if no solution is possible with the current configuration.
Generated schedules are saved locally and persist between sessions.

## License

MIT - see [LICENSE](LICENSE).
