# meathead

Weight Training App

## Version 1.0.4

- Report shortest/longest times (dead hang time vs lap times)
- Report daily 1RM 1 week out,
  - weekly 1RM, 1 month out
  - monthly 1RM, 3 months out
  - annual 1RM, 1 year out

## Version 1.0.3

- Mark exercises to not report 1RM (dry weight, climbing routes, bike routes)
- Create exercise editor to allow for editing the name and report options

## Version 1.0.2

- Use Wathan formula to calculate 1RM
  - `(weight * 100) / (48.8 + 53.8 * Math.pow(Math.E, -0.075 * reps))`
- Offline PWA

## Version 1.0.1

- Specify `start` exercise to get accurate `duration`
- Adds import, export and workout editing

## Version 1.0.0

- Specify `weight` and `repititions`
- Saves Exercise, Weight and Reps to local storage

# Known Issues

- Changes are not always rendered after editing a row (back may not be re-running the page in battery saver mode)
- FIXED: Export exports workouts but not exercise definitions
