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

    if (e.classList.contains("as-keypress")) {
      let enabled = false;
      const doit = () => raiseEvent(trigger);
      setInterval(() => enabled && doit(), 100);
      e.addEventListener("mouseup", (e) => {
        enabled = false;
      });
      e.addEventListener("mousedown", (e) => {
        enabled = true;
      });
      e.addEventListener("touchstart", (e) => {
        enabled = true;
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

  const exercises = JSON.parse(
    localStorage.getItem("exercises") || "[]"
  ) as Array<{
    tick: number;
    exercise: string;
    weight: number;
    reps: number;
  }>;

  exercise.addEventListener("change", () => {
    const exerciseValue = exercise.value;
    const rows = exercises
      .filter((d) => d.exercise === exerciseValue)
      .sort((a, b) => a.tick - b.tick);
    updateReport(report, rows);
  });

  [weight, reps].forEach(behaviorSelectAllOnFocus);
  [exercise].forEach(behaviorClearOnFocus);

  on("increment-reps", () => {
    reps.value = (parseInt(reps.value || "0") + 1).toString();
  });

  on("increment-weight", () => {
    weight.value = (parseInt(weight.value || "0") + 1).toString();
  });

  on("decrement-reps", () => {
    reps.value = (parseInt(reps.value || "0") - 1).toString();
  });

  on("decrement-weight", () => {
    weight.value = (parseInt(weight.value || "0") - 1).toString();
  });

  on("clear", () => {
    weight.value = "";
    reps.value = "";
    exercise.value = "";
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

    exercises.push({
      tick: Date.now(),
      exercise: exerciseValue,
      weight: weightValue,
      reps: repValue,
    });

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

function updateReport(
  report: HTMLTableElement,
  rows: { tick: number; exercise: string; weight: number; reps: number }[]
) {
  const html = rows.map(
    (r) =>
      `<tr><td class="align-left">${asDate(
        r.tick
      )}</td><td class="align-right">${r.reps}</td><td class="align-right">${
        r.weight
      }</td></tr>`
  );
  report.innerHTML = html.join("");
}

function asDate(tick: number) {
  return new Date(tick).toLocaleDateString();
}
