//import { workouts } from "./test/workouts";
interface ImportExportFormat {
  exercises: Exercise[];
  workouts: WorkoutSet[];
}

interface WorkoutSet {
  tick: number;
  exercise: string;
  weight: number;
  reps: number;
  exerciseDuration: number;
  location: { lon: number; lat: number };
}

interface ReportOptions {
  show1rm?: boolean;
  showmax?: boolean;
  showsum?: boolean;
}

interface Exercise {
  id: string;
  lastPerformed: number;
  reportOptions: ReportOptions;
}

const globals = {
  version: "1.0.4",
  beta: true,
};

class DateFun {
  private static readonly ticksPerDay = 24 * 60 * 60 * 1000;
  private static readonly daysPerWeek = 7;
  private static readonly weeksPerMonth = 4;

  static FromWeeksAgo(weeksAgo: number) {
    return Date.now() - weeksAgo * DateFun.ticksPerDay * DateFun.daysPerWeek;
  }

  static FromMonthsAgo(monthsAgo: number): number {
    return (
      Date.now() -
      monthsAgo *
        DateFun.ticksPerDay *
        DateFun.daysPerWeek *
        DateFun.weeksPerMonth
    );
  }
  static ticksAgo(tick: number) {
    return Date.now() - tick;
  }

  static monthsAgo(tick: number) {
    return Math.floor(
      DateFun.ticksAgo(tick) /
        (DateFun.ticksPerDay * DateFun.daysPerWeek * DateFun.weeksPerMonth)
    );
  }

  static weeksAgo(tick: number) {
    return Math.floor(
      DateFun.ticksAgo(tick) / (DateFun.ticksPerDay * DateFun.daysPerWeek)
    );
  }
}

class Database {
  updateWorkout(workout: WorkoutSet) {
    const workoutModel = this.#workouts.find((w) => w.tick == workout.tick);
    if (!workoutModel) throw new Error("Workout not found");
    workoutModel.exercise = workout.exercise;
    workoutModel.weight = workout.weight;
    workoutModel.reps = workout.reps;
    this.saveWorkouts();
  }

  getWorkout(id: number) {
    return this.#workouts.find((w) => w.tick == id);
  }

  #globals: Record<string, any>;
  #exercises: Exercise[];
  #workouts: WorkoutSet[];

  constructor() {
    this.#globals = JSON.parse(localStorage.getItem("globals") || "{}");
    this.#exercises = JSON.parse(
      localStorage.getItem("exerciseDataset") || "[]"
    ) as Array<Exercise>;

    this.#workouts = JSON.parse(
      localStorage.getItem("exercises") || "[]"
    ) as Array<WorkoutSet>;
  }

  private saveWorkouts() {
    localStorage.setItem("exercises", JSON.stringify(this.#workouts));
  }

  public importWorkouts(workouts: WorkoutSet[]) {
    this.#workouts = workouts;
    this.saveWorkouts();
  }

  public importExercises(exercises: Exercise[]) {
    this.#exercises = exercises;
    this.saveExerices();
  }

  private saveExerices() {
    localStorage.setItem("exerciseDataset", JSON.stringify(this.#exercises));
  }

  private saveGlobals() {
    localStorage.setItem("globals", JSON.stringify(this.#globals));
  }

  getExercise(id: string) {
    return this.#exercises.find((e) => e.id === id);
  }

  getExercises() {
    return this.#exercises;
  }

  getWorkouts(exerciseId: string) {
    return this.#workouts.filter((w) => w.exercise === exerciseId);
  }

  addExercise(exercise: Exercise) {
    this.#exercises.push(exercise);
    this.saveExerices();
  }

  addWorkout(workout: WorkoutSet) {
    this.#workouts.push(workout);
    this.saveWorkouts();
  }

  updateExercise(exercise: Exercise) {
    const exerciseModel = this.#exercises.find((d) => d.id == exercise.id);
    if (!exerciseModel) throw new Error("Exercise not found");
    exerciseModel.lastPerformed = exercise.lastPerformed;
    this.saveExerices();
  }

  renameExercise(id: string, name: string) {
    const exerciseModel = this.#exercises.find((d) => d.id == id);
    if (!exerciseModel) throw new Error("Exercise not found");
    const workouts = this.#workouts.filter((w) => w.exercise === id);
    exerciseModel.id = name;
    workouts.forEach((w) => (w.exercise = name));
    this.saveExerices();
    this.saveWorkouts();
  }

  setGlobal(key: string, value: any) {
    this.#globals[key] = value;
    this.saveGlobals();
  }

  getGlobal(key: string) {
    return this.#globals[key];
  }
}

class WhereAmI {
  // returns the coordinates of the current location
  static getLocation() {
    return new Promise<{ lat: number; lng: number }>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          reject(error);
        }
      );
    });
  }
}

function applySticky(db: Database) {
  const sticky = Array.from(document.querySelectorAll(".is-sticky")) as Array<
    HTMLInputElement | HTMLSelectElement
  >;
  sticky.forEach((s) => {
    s.addEventListener("change", () => {
      const value = s.value;
      db.setGlobal(s.id, value);
    });
    const value = db.getGlobal(s.id);
    // be careful not to create a change trigger loop
    if (value && value != s.value) {
      s.value = value;
      if (s.value) {
        s.dispatchEvent(new Event("change"));
      }
    }
  });
}

function applyTriggers(scope: HTMLElement | Document = document) {
  const triggers = Array.from(
    scope.querySelectorAll("[data-trigger]")
  ) as Array<HTMLInputElement>;
  triggers.forEach((e) => {
    const eventName = e.getAttribute("data-trigger");
    if (!eventName) return;
    let enabled = false;

    const doit = debounce(() => {
      trigger(eventName, e);
      if (!enabled) return;
      requestAnimationFrame(doit);
    }, 100);

    if (e.classList.contains("as-keypress")) {
      e.addEventListener("mousedown", (e) => {
        enabled = true;
        doit();
        e.preventDefault();
      });

      e.addEventListener("touchstart", (e) => {
        enabled = true;
        doit();
        e.preventDefault();
      });

      e.addEventListener("mouseup", (e) => {
        enabled = false;
        e.preventDefault();
      });

      e.addEventListener("touchend", (e) => {
        enabled = false;
        e.preventDefault();
      });
    } else {
      e.addEventListener("click", () => {
        trigger(eventName, e);
      });
    }
  });
}

function toaster(message: string) {
  const toaster = document.getElementById("toaster") as HTMLDivElement;
  toaster.classList.remove("hidden");
  toaster.innerText = message;
  setTimeout(() => {
    toaster.classList.add("hidden");
  }, 1000);
}

function increment(reps: HTMLInputElement, amount: number) {
  reps.value = (parseInt(reps.value || "0") + amount).toString();
  // trigger a synthetic change event
  reps.dispatchEvent(new Event("change"));
}

function addExerciseToDropdown(
  exerciseValue: string,
  exercisesDom: HTMLSelectElement
) {
  const option = document.createElement("option");
  option.value = exerciseValue;
  option.innerText = exerciseValue;
  exercisesDom.insertBefore(option, null);
}

// raise an HTML event
function trigger(trigger: string, node?: HTMLElement) {
  if (!trigger) return;
  const event = new CustomEvent(trigger, {
    detail: {
      message: trigger,
      node,
    },
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(event);
}

// listen for a dispatched event
function on(trigger: string, callback: (node: HTMLElement) => void) {
  document.addEventListener(trigger, (e: CustomEventInit) => {
    callback(e.detail.node);
  });
}

const behaviors = {
  selectAllOnFocus: (e: HTMLInputElement) =>
    e.addEventListener("focus", () => e.select()),

  clearOnFocus: (e: HTMLInputElement | HTMLSelectElement) =>
    e.addEventListener("focus", () => (e.value = "")),
};

function compute1RepMaxUsingWathan(weight: number, reps: number) {
  return (weight * 100) / (48.8 + 53.8 * Math.pow(Math.E, -0.075 * reps));
}

function updateReport(
  report: HTMLTableElement,
  exercise: Exercise | null,
  rows: WorkoutSet[]
) {
  const header = `
  <span class="col1 fill-width underline align-left">Date</span>
  <span class="col2 fill-width underline align-right">Reps</span>
  <span class="col3 fill-width underline align-right">Weight</span>
`;

  const itemsThisWeek = rows.filter((r) => {
    return 0 === DateFun.weeksAgo(r.tick);
  });

  // last 35 days aggregated weekly
  const itemsThisQuarter = rows
    .filter((r) => {
      const week = DateFun.weeksAgo(r.tick);
      return 0 <= week && week <= 12;
    })
    .map((workout) => ({ ...workout, group: DateFun.weeksAgo(workout.tick) }));

  let html =
    header +
    itemsThisWeek
      .map((r) =>
        createReportRow({
          key: r.tick,
          col1: asDate(r.tick),
          col2: r.exerciseDuration
            ? `${asDate(Date.now() - r.exerciseDuration)} ${r.reps}`
            : r.reps.toFixed(0),
          col3: r.weight.toFixed(0),
        })
      )
      .join("");

  if (false !== exercise?.reportOptions?.show1rm) {
    html += findMax(itemsThisQuarter, compute1RepMaxUsingWathan)
      .map((r) =>
        createReportRow({
          key: `week(${r.tick})`,
          col1: `${r.tick}w`,
          col2: "1RM",
          col3: r.weight.toFixed(1),
        })
      )
      .join("");
  }

  if (false !== exercise?.reportOptions?.showmax) {
    html += findMax(itemsThisQuarter, (w, r) => w)
      .map((r) =>
        createReportRow({
          key: `week(${r.tick})`,
          col1: `${r.tick}w`,
          col2: "Max",
          col3: r.weight.toFixed(1),
        })
      )
      .join("");
  }

  if (false !== exercise?.reportOptions?.showsum) {
    html += findSum(itemsThisQuarter, (w, r) => w * r)
      .map((r) =>
        createReportRow({
          key: `week(${r.tick})`,
          col1: `${r.tick}w`,
          col2: "RW",
          col3: r.weight.toFixed(1),
        })
      )
      .join("");
  }

  report.innerHTML = html;
  applyTriggers(report);
}

function findOp(
  items: (WorkoutSet & { group: number })[],
  op: (weight: number, reps: number) => number,
  aggregator: (...a: number[]) => number
) {
  const groups = [] as Array<number>;
  items.forEach((item) => {
    const orm = Math.floor(op(item.weight, item.reps));
    groups[item.group] = aggregator(groups[item.group] || 0, orm);
  });
  return groups.map((orm, groupId) => ({
    weight: orm,
    reps: 1,
    tick: groupId,
    exercise: "",
    exerciseDuration: 0,
  }));
}

function findMax(
  items: (WorkoutSet & { group: number })[],
  op: (weight: number, reps: number) => number
) {
  return findOp(items, op, Math.max);
}

function findSum(
  items: (WorkoutSet & { group: number })[],
  op: (weight: number, reps: number) => number
) {
  return findOp(items, op, (a, b) => a + b);
}

function insertReportItem(report: HTMLTableElement, row: WorkoutSet) {
  const html = createReportRow({
    key: row.tick,
    col1: asDate(row.tick),
    col2: row.reps.toFixed(0),
    col3: row.weight.toFixed(0),
  });
  report.insertAdjacentHTML("afterbegin", html);
}

function createReportRow(r: {
  key: number | string;
  col1: string;
  col2: string;
  col3: string;
}): string {
  return `
  <button 
    class="col1 fill-width align-left dark-background light-text no-border" 
    data-trigger="edit-workout" 
    data-id="${r.key}">${r.col1}</button>
  <span class="col2 fill-width align-right">${r.col2}</span>
  <span class="col3 fill-width align-right">${r.col3}</span>`;
}

function asDate(tick: number) {
  if (!tick) return "";
  const dt = Date.now() - tick;
  const dtSec = Math.floor(dt / 1000);
  const dtMin = Math.floor(dtSec / 60);
  const dtHr = Math.floor(dtMin / 60);
  const dtDay = Math.floor(dtHr / 24);
  if (dtDay > 7) return new Date(tick).toLocaleDateString();
  if (dtDay) return `${dtDay}d ${dtHr % 24}h`;
  if (dtHr) return `${dtHr}h ${dtMin % 60}m`;
  if (dtMin) return `${dtMin}m ${dtSec % 60}s`;
  return `${dtSec}s`;
}

function debounce<T extends Function>(cb: T, wait = 20) {
  let h = 0;
  let callable = (...args: any) => {
    clearTimeout(h);
    h = setTimeout(() => cb(...args), wait);
  };
  return <T>(<any>callable);
}
function moveExerciseToTopOfDropdown(
  exerciseValue: string,
  exercisesDom: HTMLSelectElement
) {
  const option = exercisesDom.querySelector(`option[value="${exerciseValue}"]`);
  if (!option) return;
  exercisesDom.removeChild(option);
  exercisesDom.insertBefore(option, exercisesDom.firstChild);
}

function applyBinds(binds: Record<string, (e: HTMLElement) => void>) {
  Object.entries(binds).forEach(([key, cb]) => {
    const e = document.querySelector(`[data-bind="${key}"]`) as HTMLElement;
    if (!e) return;
    cb(e);
  });
}

/**
 * Install a service workder to cache the app.
 */
function installServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("./sw.js")
      .then(() => {
        console.log("Service worker installed");
      })
      .catch((err) => {
        console.error("Service worker failed to install", err);
      });
  }
}

export function run() {
  if (!globals.beta) installServiceWorker();
  const db = new Database();
  const exerciseStore = db
    .getExercises()
    .sort((a, b) => (b.lastPerformed || 0) - (a.lastPerformed || 0));

  let timeOfLastExercise = exerciseStore[0]?.lastPerformed || 0;

  const adminMenuDom = document.querySelector(
    "#admin-menu"
  ) as HTMLSelectElement;

  const reportDom = document.getElementById("report-body") as HTMLTableElement;
  const formDom = document.getElementById("form") as HTMLFormElement;
  const exerciseDom = document.getElementById("exercise") as HTMLSelectElement;
  const weightDom = document.getElementById("weight") as HTMLInputElement;
  const repsDom = document.getElementById("reps") as HTMLInputElement;

  on("update-report", () => {
    const exerciseValue = exerciseDom.value;
    const exercise = db.getExercises().find((e) => e.id === exerciseValue);
    if (!exercise) throw new Error(`Exercise not found: ${exercise}`);
    const rows = db.getWorkouts(exerciseValue).sort((a, b) => b.tick - a.tick);
    updateReport(reportDom, exercise, rows);
    const maxOrm = Math.max(
      0,
      ...rows.map((r) => compute1RepMaxUsingWathan(r.weight, r.reps))
    );
    show("#orm", `1RM=${maxOrm.toFixed(0)}`);
  });

  on("exercise-clear", () => updateReport(reportDom, null, []));

  on("increment-reps", () => {
    increment(repsDom, 1);
  });

  on("increment-weight", () => {
    increment(weightDom, 1);
  });

  on("decrement-reps", () => {
    increment(repsDom, -1);
  });

  on("decrement-weight", () => {
    increment(weightDom, -1);
  });

  on("open-export-form", () => {
    window.location.href = "./pages/export.html";
  });

  on("open-import-form", () => {
    window.location.href = "./pages/import.html";
  });

  on("clear", () => {
    weightDom.value = "";
    repsDom.value = "";
    exerciseDom.value = "";
    db.setGlobal("exerciseStartTime", 0);
    trigger("exercise-clear");
  });

  on("save", async () => {
    if (!formDom.reportValidity()) return;

    const exerciseValue = exerciseDom.value;
    const weightValue = parseInt(weightDom.value || "0");
    const repValue = parseInt(repsDom.value || "0");

    const work = weightValue * repValue;
    if (work <= 0) return;

    const exerciseModel = exerciseStore.find((e) => e.id === exerciseValue);
    timeOfLastExercise = Date.now();
    if (!exerciseModel) {
      db.addExercise({
        id: exerciseValue,
        lastPerformed: timeOfLastExercise,
        reportOptions: {
          show1rm: true,
        },
      });
      addExerciseToDropdown(exerciseValue, exerciseDom);
    } else {
      moveExerciseToTopOfDropdown(exerciseValue, exerciseDom);
      db.updateExercise({
        id: exerciseValue,
        lastPerformed: timeOfLastExercise,
        reportOptions: {
          show1rm: true,
        },
      });
    }

    const exerciseStartTime = db.getGlobal("exerciseStartTime");

    const workout = {
      tick: timeOfLastExercise,
      exercise: exerciseValue,
      weight: weightValue,
      reps: repValue,
      exerciseDuration: exerciseStartTime ? Date.now() - exerciseStartTime : 0,
    } as WorkoutSet;

    const location = await WhereAmI.getLocation();
    workout.location = { lon: location.lng, lat: location.lat };

    // restart the exercise timer
    if (exerciseStartTime) db.setGlobal("exerciseStartTime", Date.now());

    insertReportItem(reportDom, workout);

    db.addWorkout(workout);
    trigger("saved");
    trigger("update-report");

    const orm = compute1RepMaxUsingWathan(workout.weight, workout.reps);
    show("#latestOrm", `${orm.toFixed(0)}`);
  });

  on("saved", () => {
    // notify the user the workout was saved using a toaster slider
    toaster("Workout Saved");
  });

  on("start-exercise", () => {
    if (!formDom.reportValidity()) return;
    const exerciseStartTime = db.getGlobal("exerciseStartTime");
    if (!exerciseStartTime) {
      db.setGlobal("exerciseStartTime", Date.now());
      toaster("Timer Started");
    } else {
      db.setGlobal("exerciseStartTime", 0);
      toaster("Timer Stopped");
    }
  });

  on("create-exercise", () => {
    const newName = prompt("New Exercise", "New Exercise");
    if (!newName) return;
    db.addExercise({
      id: newName,
      lastPerformed: Date.now(),
      reportOptions: {},
    });
    addExerciseToDropdown(newName, exerciseDom);
  });

  on("edit-exercise", () => {
    const exerciseValue = exerciseDom.value;
    const exercise = db.getExercises().find((e) => e.id === exerciseValue);
    if (!exercise) throw new Error(`Exercise not found: ${exercise}`);
    window.location.href = `./pages/edit-exercise.html?id=${exercise.id}`;
  });

  on("edit-workout", (e: HTMLElement) => {
    const id = e.dataset.id;
    window.location.href = `./pages/edit-workout.html?id=${id}`;
  });

  on("startup", () => {
    // report globals
    Object.keys(globals).forEach((id) => {
      const target = document.getElementById(id);
      if (target)
        target.innerText = globals[<keyof typeof globals>(<any>id)] + "";
    });

    // populate the exercise dropdown
    exerciseStore.forEach((x) => addExerciseToDropdown(x.id, exerciseDom));

    // watch for user to select an exercise
    exerciseDom.addEventListener("change", () => {
      db.setGlobal("exerciseStartTime", 0);
      trigger("update-report");
      trigger("autofill");
    });

    // autofill the form with the last workout
    applySticky(db);

    // report pre-defined bindings
    applyBinds({
      "time-since-last-exercise": (e: HTMLElement) => {
        function doit() {
          const exerciseStartTime = db.getGlobal("exerciseStartTime");
          e.innerText = asDate(exerciseStartTime || timeOfLastExercise);
        }
        doit();
        setInterval(() => requestAnimationFrame(doit), 1000);
      },
    });

    // hookup data-trigger to click events
    applyTriggers();

    // select full text on focus for these nodes (TODO: move into markup via class "select-on-focus")
    [weightDom, repsDom].forEach(behaviors.selectAllOnFocus);

    adminMenuDom.value = "";
    adminMenuDom.addEventListener("change", () => {
      Array.from(adminMenuDom.selectedOptions).forEach((option) => {
        const event = option.getAttribute("data-trigger");
        if (event) trigger(event);
        adminMenuDom.value = "";
      });
    });

    // show the exercise history grid on startup
    trigger("update-report");
  });

  on("autofill", () => {
    const lastWorkout = db
      .getWorkouts(exerciseDom.value)
      .sort((a, b) => b.tick - a.tick)[0];
    if (!lastWorkout) return;
    weightDom.value = lastWorkout.weight.toString();
    repsDom.value = lastWorkout.reps.toString();
    const orm = compute1RepMaxUsingWathan(lastWorkout.weight, lastWorkout.reps);
    show("#latestOrm", `${orm.toFixed(0)}`);
  });

  trigger("startup");
}

export function runExport() {
  applyTriggers();
  const db = new Database();
  const exercises = db.getExercises();
  const exercisesDom = document.querySelector(
    "#exercises"
  ) as HTMLTextAreaElement;
  const workouts = exercises
    .map((exercise) => db.getWorkouts(exercise.id))
    .flat(1);

  const exportData: ImportExportFormat = { exercises, workouts };
  exercisesDom.value = JSON.stringify(exportData, null, "  ");
  exercisesDom.select();
  on("copy-workouts-to-clipboard", () => {
    const data = exercisesDom.value;
    navigator.clipboard.writeText(data);
    toaster("Workouts copied to clipboard");
  });
}

export function runImport() {
  applyTriggers();
  const db = new Database();
  const exercisesDom = document.querySelector(
    "#exercises"
  ) as HTMLTextAreaElement;

  on("import-workouts", () => {
    try {
      const exportData = JSON.parse(exercisesDom.value) as ImportExportFormat;

      exportData.exercises.forEach((exercise) => {
        exercise.reportOptions = exercise.reportOptions || {
          show1rm: true,
          showmax: true,
        };
        if (false !== exercise.reportOptions?.show1rm)
          exercise.reportOptions.show1rm = true;
        if (false !== exercise.reportOptions?.showmax)
          exercise.reportOptions.showmax = true;
      });

      db.importExercises(exportData.exercises);
      db.importWorkouts(exportData.workouts);
      toaster("Workouts replaced");
    } catch (ex) {
      toaster(ex + "");
    }
  });
}

export function runEditWorkout() {
  // get id from the location query string
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) throw new Error("no id");
  const db = new Database();
  const workout = db.getWorkout(Number.parseInt(id));
  if (!workout) throw new Error("no workout");
  applyTriggers();

  const exerciseDom = document.getElementById("exercise") as HTMLInputElement;
  const weightDom = document.getElementById("weight") as HTMLInputElement;
  const repsDom = document.getElementById("reps") as HTMLInputElement;
  [exerciseDom, weightDom, repsDom].forEach(behaviors.selectAllOnFocus);
  exerciseDom.value = workout.exercise;
  repsDom.value = workout.reps.toString();
  weightDom.value = workout.weight.toString();

  on("change-workout", () => {
    workout.exercise = exerciseDom.value;
    workout.reps = Number.parseInt(repsDom.value);
    workout.weight = Number.parseInt(weightDom.value);
    db.updateWorkout(workout);
    toaster("Workout updated");
    window.history.back();
  });
}

function show(selector: string, value: string) {
  const dom = document.querySelector(selector) as HTMLElement;
  if (!dom) return;
  dom.innerText = value;
}

// import { workouts } from "./test/workouts.js";
// console.log(JSON.stringify(workouts, null, " "));

export function runEditExercise() {
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) throw new Error("no id");
  const db = new Database();
  const exercise = db.getExercise(id);
  if (!exercise) throw new Error("no exercise found");
  applyTriggers();

  const exerciseDom = document.getElementById("exercise") as HTMLInputElement;
  const options: Array<keyof ReportOptions> = ["show1rm", "showmax", "showsum"];
  exerciseDom.value = id;

  exercise.reportOptions = exercise.reportOptions || {};

  options.forEach((id) => {
    const dom = document.getElementById(id) as HTMLInputElement;
    if (!dom) return;
    dom.checked = false !== exercise.reportOptions[id];
  });

  on("change-exercise", () => {
    if (exerciseDom.value != exercise.id) {
      db.renameExercise(exercise.id, exerciseDom.value);
      exercise.id = exerciseDom.value;
    }

    options.forEach((id) => {
      const dom = document.getElementById(id) as HTMLInputElement;
      if (!dom) return;
      exercise.reportOptions[id] = dom.checked;
    });

    db.updateExercise(exercise);

    toaster("Exercise updated");
    window.history.back();
  });
}
