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

class Database {
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
      s.value = value;
      console.log(`sticky set: ${s.id} = ${value}`);
    }
  });
}

function applyTriggers() {
  const triggers = Array.from(
    document.querySelectorAll("[data-trigger]")
  ) as Array<HTMLInputElement>;
  triggers.forEach((e) => {
    const eventName = e.getAttribute("data-trigger");
    let enabled = false;

    const doit = debounce(() => {
      trigger(eventName);
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
        trigger(eventName);
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
function trigger(trigger: string | null) {
  if (!trigger) return;
  const event = new CustomEvent(trigger, {
    detail: {
      message: trigger,
    },
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(event);
}

// listen for a dispatched event
function on(trigger: string, callback: () => void) {
  document.addEventListener(trigger, () => {
    callback();
  });
}

function behaviorSelectAllOnFocus(e: HTMLInputElement) {
  e.addEventListener("focus", () => e.select());
}

function behaviorClearOnFocus(e: HTMLInputElement | HTMLSelectElement) {
  e.addEventListener("focus", () => (e.value = ""));
}

function updateReport(report: HTMLTableElement, rows: WorkoutSet[]) {
  const html = rows.map((r) => createReportRow(r));
  report.innerHTML = html.join("");
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
  return `<tr><td class="align-left">${asDate(
    r.tick
  )}</td><td class="align-right">${col2}</td><td class="align-right">${
    r.weight
  }</td></tr>`;
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
  });

  on("exercise-clear", () => updateReport(reportDom, []));

  on("increment-reps", () => {
    repsDom.focus();
    increment(repsDom, 1);
  });

  on("increment-weight", () => {
    weightDom.focus();
    increment(weightDom, 1);
  });

  on("decrement-reps", () => {
    repsDom.focus();
    increment(repsDom, -1);
  });

  on("decrement-weight", () => {
    weightDom.focus();
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

  on("startup", () => {
    console.log("loading exercises");
    exerciseStore.forEach((x) => addExerciseToDropdown(x.id, exerciseDom));

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

    exerciseDom.addEventListener("change", () => {
      db.setGlobal("exerciseStartTime", 0);
      trigger("update-report");
      trigger("autofill");
    });

    [weightDom, repsDom].forEach(behaviorSelectAllOnFocus);
    [exerciseDom].forEach(behaviorClearOnFocus);

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
    const workouts = JSON.parse(exercisesDom.value) as WorkoutSet[];
    db.importWorkouts(workouts);
    toaster("Workouts replaced");
  });
}
