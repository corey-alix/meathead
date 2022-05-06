# meathead

Weight Training App

## Version 1.0.3

- Mark exercises to not report 1RM (dry weight, climbing routes, bike routes)
- Report shortest/longest times (dead hang time vs lap times)
- Report daily 1RM 1 week out,
  - weekly 1RM, 1 month out
  - monthly 1RM, 3 months out
  - annual 1RM, 1 year out

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

- FIXED: After a row edit the grid disappears
- CANNOT REPRODUCE: Changes are not applied after editing a row
