interface WorkoutSet {
  tick: number;
  exercise: string;
  weight: number;
  reps: number;
  exerciseDuration: number;
}

interface Exercise {
  id: string;
  lastPerformed: number;
}

const globals = {
  version: "1.0.2",
};

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
    window.location.reload();
  }

  setGlobal(key: string, value: any) {
    this.#globals[key] = value;
    this.saveGlobals();
  }

  getGlobal(key: string) {
    return this.#globals[key];
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
    if (typeof value != "undefined") {
      if (s.value != value) {
        s.value = value;
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

function behaviorSelectAllOnFocus(e: HTMLInputElement) {
  e.addEventListener("focus", () => e.select());
}

function behaviorClearOnFocus(e: HTMLInputElement | HTMLSelectElement) {
  e.addEventListener("focus", () => (e.value = ""));
}

function compute1RepMaxUsingWathan(weight: number, reps: number) {
  return (weight * 100) / (48.8 + 53.8 * Math.pow(Math.E, -0.075 * reps));
}

function updateReport(report: HTMLTableElement, rows: WorkoutSet[]) {
  const header = `
  <span class="col1 fill-width underline align-left">Date</span>
  <span class="col2 fill-width underline align-right">Reps</span>
  <span class="col3 fill-width underline align-right">Weight</span>
`;

  const html = rows.map((r) => createReportRow(r));
  report.innerHTML = header + html.join("");
  applyTriggers(report);
  report.parentElement?.classList.toggle("hidden", rows.length === 0);
}

function insertReportItem(report: HTMLTableElement, row: WorkoutSet) {
  const html = createReportRow(row);
  report.insertAdjacentHTML("afterbegin", html);
  report.parentElement?.classList.remove("hidden");
}

function createReportRow(r: WorkoutSet): string {
  const col2 = r.exerciseDuration
    ? `${asDate(Date.now() - r.exerciseDuration)} ${r.reps}`
    : r.reps;
  return `
  <button 
    class="col1 fill-width align-left dark-background light-text no-border" 
    data-trigger="edit-workout" 
    data-id="${r.tick}">${asDate(r.tick)}</button>
  <span class="col2 fill-width align-right">${col2}</span>
  <span class="col3 fill-width align-right">${r.weight}</span>`;
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
  //installServiceWorker();
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
    const rows = db.getWorkouts(exerciseValue).sort((a, b) => b.tick - a.tick);
    updateReport(reportDom, rows);
    const maxOrm = Math.max(
      ...rows.map((r) => compute1RepMaxUsingWathan(r.weight, r.reps))
    );
    show("#orm", `1RM=${maxOrm.toFixed(0)}`);
  });

  on("exercise-clear", () => updateReport(reportDom, []));

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

  on("save", () => {
    if (!formDom.reportValidity()) return;

    const exerciseValue = exerciseDom.value;
    const weightValue = parseInt(weightDom.value || "0");
    const repValue = parseInt(repsDom.value || "0");

    const work = weightValue * repValue;
    if (work <= 0) return;

    const exerciseModel = exerciseStore.find((e) => e.id === exerciseValue);
    timeOfLastExercise = Date.now();
    if (!exerciseModel) {
      db.addExercise({ id: exerciseValue, lastPerformed: timeOfLastExercise });
      addExerciseToDropdown(exerciseValue, exerciseDom);
    } else {
      moveExerciseToTopOfDropdown(exerciseValue, exerciseDom);
      db.updateExercise({
        id: exerciseValue,
        lastPerformed: timeOfLastExercise,
      });
    }

    const exerciseStartTime = db.getGlobal("exerciseStartTime");

    const workout = {
      tick: timeOfLastExercise,
      exercise: exerciseValue,
      weight: weightValue,
      reps: repValue,
      exerciseDuration: exerciseStartTime ? Date.now() - exerciseStartTime : 0,
    };

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
    db.addExercise({ id: newName, lastPerformed: 0 });
    addExerciseToDropdown(newName, exerciseDom);
  });

  on("rename-exercise", () => {
    const exercise = exerciseDom.value || "unnamed";
    const newName = prompt("New name", exercise);
    if (!newName) return;
    db.renameExercise(exercise, newName);
  });

  on("edit-workout", (e: HTMLElement) => {
    const id = e.dataset.id;
    window.location.href = `./pages/edit-workout.html?id=${id}`;
  });

  on("startup", () => {
    Object.keys(globals).forEach((id) => {
      const target = document.getElementById(id);
      if (target) target.innerText = globals[<keyof typeof globals>(<any>id)];
    });

    exerciseStore.forEach((x) => addExerciseToDropdown(x.id, exerciseDom));

    exerciseDom.addEventListener("change", () => {
      db.setGlobal("exerciseStartTime", 0);
      trigger("update-report");
      trigger("autofill");
    });

    applySticky(db);

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

    applyTriggers();

    [weightDom, repsDom].forEach(behaviorSelectAllOnFocus);
    //[exerciseDom].forEach(behaviorClearOnFocus);

    adminMenuDom.value = "";
    adminMenuDom.addEventListener("change", () => {
      Array.from(adminMenuDom.selectedOptions).forEach((option) => {
        const event = option.getAttribute("data-trigger");
        if (event) trigger(event);
        adminMenuDom.value = "";
      });
    });
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
  exercisesDom.value = JSON.stringify(workouts, null, "  ");
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
      const workouts = JSON.parse(exercisesDom.value) as WorkoutSet[];
      const exerciseNames = Array.from(
        new Set(workouts.map((workout) => workout.exercise))
      );
      const exercises: Exercise[] = exerciseNames.map((id) => {
        const lastPerformed = Math.max(
          ...workouts.filter((w) => w.exercise === id)!.map((w) => w.tick)
        );
        return {
          id,
          lastPerformed,
        };
      });
      db.importExercises(exercises);
      db.importWorkouts(workouts);
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
  [exerciseDom, weightDom, repsDom].forEach(behaviorSelectAllOnFocus);
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
