interface WorkoutSet {
  tick: number;
  exercise: string;
  weight: number;
  reps: number;
}

interface Exercise {
  id: string;
  lastPerformed: number;
}

class Database {
  #exercises: Exercise[];
  #workouts: WorkoutSet[];

  constructor() {
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

  private saveExerices() {
    localStorage.setItem("exerciseDataset", JSON.stringify(this.#exercises));
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
}

let timeOfLastExercise = 0;

const binds = {
  "time-since-last-exercise": (e: HTMLElement) => {
    setInterval(() => {
      e.innerText = asDate(timeOfLastExercise);
    }, 1000);
  },
};

function applyBinds() {
  Object.entries(binds).forEach(([key, cb]) => {
    const e = document.querySelector(`[data-bind="${key}"]`) as HTMLElement;
    if (!e) return;
    cb(e);
  });
}

export function run() {
  applyBinds();

  const db = new Database();
  const exerciseStore = db
    .getExercises()
    .sort((a, b) => (b.lastPerformed || 0) - (a.lastPerformed || 0));

  timeOfLastExercise = exerciseStore[0]?.lastPerformed || 0;

  const exercisesDom = document.getElementById(
    "exercises"
  ) as HTMLDataListElement;

  exerciseStore.forEach((x) => {
    addExerciseToDropdown(x.id, exercisesDom);
  });

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

  const reportDom = document.getElementById("report-body") as HTMLTableElement;
  const formDom = document.getElementById("form") as HTMLFormElement;
  const exerciseDom = document.getElementById("exercise") as HTMLInputElement;
  const weightDom = document.getElementById("weight") as HTMLInputElement;
  const repsDom = document.getElementById("reps") as HTMLInputElement;

  exerciseDom.addEventListener("click", () => {
    trigger("clear");
  });

  exerciseDom.addEventListener("change", () => {
    trigger("update-report");
    trigger("autofill");
  });

  [weightDom, repsDom].forEach(behaviorSelectAllOnFocus);
  [exerciseDom].forEach(behaviorClearOnFocus);

  on("show-admin-menu", () => {
    const menu = {
      Noop: () => {},
      "Rename exercise": () => {
        const exercise = exerciseDom.value || "unnamed";
        const newName = prompt("New name", exercise);
        if (!newName) return;
        db.renameExercise(exercise, newName);
      },
    };
    const selectDom = document.createElement("select");
    selectDom.addEventListener("change", () => {
      const key = selectDom.value as keyof typeof menu;
      const cb = menu[key];
      if (cb) {
        cb();
        selectDom.remove();
      }
    });
    Object.entries(menu).forEach(([key, cb]) => {
      const option = document.createElement("option");
      option.value = key;
      option.innerText = key;
      selectDom.appendChild(option);
    });
    document.body.insertBefore(selectDom, null);
  });

  on("autofill", () => {
    const lastWorkout = db
      .getWorkouts(exerciseDom.value)
      .sort((a, b) => b.tick - a.tick)[0];
    if (!lastWorkout) return;
    weightDom.value = lastWorkout.weight.toString();
    repsDom.value = lastWorkout.reps.toString();
  });

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

  on("clear", () => {
    weightDom.value = "";
    repsDom.value = "";
    exerciseDom.value = "";
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
      addExerciseToDropdown(exerciseValue, exercisesDom);
    } else {
      db.updateExercise({
        id: exerciseValue,
        lastPerformed: timeOfLastExercise,
      });
      moveExerciseToTop(exerciseValue, exercisesDom);
    }

    const workout = {
      tick: timeOfLastExercise,
      exercise: exerciseValue,
      weight: weightValue,
      reps: repValue,
    };
    insertReportItem(reportDom, workout);

    db.addWorkout(workout);
    trigger("saved");
    trigger("update-report");
  });

  on("saved", () => {
    // notify the user the workout was saved using a toaster slider

    // show the toaster slider
    const toaster = document.getElementById("toaster") as HTMLDivElement;
    toaster.classList.remove("hidden");
    toaster.innerText = "Workout Saved";
    setTimeout(() => {
      toaster.classList.add("hidden");
    }, 1000);
  });
}

function increment(reps: HTMLInputElement, amount: number) {
  reps.value = (parseInt(reps.value || "0") + amount).toString();
}

function addExerciseToDropdown(
  exerciseValue: string,
  exercisesDom: HTMLDataListElement
) {
  const option = document.createElement("option");
  option.value = exerciseValue;
  option.innerText = exerciseValue;
  exercisesDom.insertBefore(option, null);
}

function moveExerciseToTop(
  exerciseValue: string,
  exercisesDom: HTMLDataListElement
) {
  const option = exercisesDom.querySelector(`option[value="${exerciseValue}"]`);
  if (!option) return;
  exercisesDom.insertBefore(option, exercisesDom.firstChild);
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

function behaviorClearOnFocus(e: HTMLInputElement) {
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
  return `<tr><td class="align-left">${asDate(
    r.tick
  )}</td><td class="align-right">${r.reps}</td><td class="align-right">${
    r.weight
  }</td></tr>`;
}

function asDate(tick: number) {
  const dtSec = Math.floor((Date.now() - tick) / 1000);
  if (dtSec < 60) return `${dtSec} seconds ago`;
  if (dtSec < 3600) return `${Math.floor(dtSec / 60)} minutes ago`;
  if (dtSec < 86400) return `${Math.floor(dtSec / 3600)} hours ago`;
  return `${Math.floor(dtSec / 86400)} days ago`;
}

function debounce<T extends Function>(cb: T, wait = 20) {
  let h = 0;
  let callable = (...args: any) => {
    clearTimeout(h);
    h = setTimeout(() => cb(...args), wait);
  };
  return <T>(<any>callable);
}
