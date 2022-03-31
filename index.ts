export function run() {
  const exerciseDataset = JSON.parse(
    localStorage.getItem("exerciseDataset") || "[]"
  ) as Array<{ id: string }>;

  const exercisesDom = document.getElementById(
    "exercises"
  ) as HTMLDataListElement;

  exerciseDataset.forEach((x) => {
    addExerciseToDropdown(x.id, exercisesDom);
  });

  const triggers = Array.from(
    document.querySelectorAll("[data-trigger]")
  ) as Array<HTMLInputElement>;
  triggers.forEach((e) => {
    const trigger = e.getAttribute("data-trigger");
    let enabled = false;

    const doit = debounce(() => {
      raiseEvent(trigger);
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
        raiseEvent(trigger);
      });
    }
  });

  const report = document.getElementById("report-body") as HTMLTableElement;
  const form = document.getElementById("form") as HTMLFormElement;
  const exercise = document.getElementById("exercise") as HTMLInputElement;
  const weight = document.getElementById("weight") as HTMLInputElement;
  const reps = document.getElementById("reps") as HTMLInputElement;

  exercise.addEventListener("click", () => {
    exercise.value = "";
    raiseEvent("exercise-clear");
  });

  const exercises = JSON.parse(
    localStorage.getItem("exercises") || "[]"
  ) as Array<WorkoutSet>;

  exercise.addEventListener("change", () => {
    const exerciseValue = exercise.value;
    const rows = exercises
      .filter((d) => d.exercise === exerciseValue)
      .sort((a, b) => b.tick - a.tick);
    updateReport(report, rows);
  });

  [weight, reps].forEach(behaviorSelectAllOnFocus);
  [exercise].forEach(behaviorClearOnFocus);

  on("exercise-clear", () => updateReport(report, []));

  on("increment-reps", () => {
    reps.focus();
    increment(reps, 1);
  });

  on("increment-weight", () => {
    weight.focus();
    increment(weight, 1);
  });

  on("decrement-reps", () => {
    reps.focus();
    increment(reps, -1);
  });

  on("decrement-weight", () => {
    weight.focus();
    increment(weight, -1);
  });

  on("clear", () => {
    weight.value = "";
    reps.value = "";
    exercise.value = "";
    raiseEvent("exercise-clear");
  });

  on("save", () => {
    if (!form.reportValidity()) return;

    const exerciseValue = exercise.value;
    const weightValue = parseInt(weight.value || "0");
    const repValue = parseInt(reps.value || "0");

    const work = weightValue * repValue;
    if (work <= 0) return;

    if (!exerciseDataset.find((e) => e.id === exerciseValue)) {
      exerciseDataset.push({ id: exerciseValue });
      localStorage.setItem("exerciseDataset", JSON.stringify(exerciseDataset));
      addExerciseToDropdown(exerciseValue, exercisesDom);
    }

    const exerciseData = {
      tick: Date.now(),
      exercise: exerciseValue,
      weight: weightValue,
      reps: repValue,
    };
    exercises.push(exerciseData);
    insertReportItem(report, exerciseData);

    localStorage.setItem("exercises", JSON.stringify(exercises));
    raiseEvent("saved");
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
  exercisesDom.appendChild(option);
}

// raise an HTML event
function raiseEvent(trigger: string | null) {
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

interface WorkoutSet {
  tick: number;
  exercise: string;
  weight: number;
  reps: number;
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
