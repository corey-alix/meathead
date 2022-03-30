export function run() {
  const triggers = Array.from(document.querySelectorAll("[data-trigger]"));
  triggers.forEach((e) => {
    const trigger = e.getAttribute("data-trigger");
    e.addEventListener("click", () => {
      raiseEvent(trigger);
    });
  });

  const form = document.getElementById("form") as HTMLFormElement;
  const exercise = document.getElementById("exercise") as HTMLInputElement;
  const weight = document.getElementById("weight") as HTMLInputElement;
  const reps = document.getElementById("reps") as HTMLInputElement;

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
    const weightValue = parseInt(weight.value || "0");
    const repValue = parseInt(reps.value || "0");

    const work = weightValue * repValue;
    if (work <= 0) return;

    const exercises = JSON.parse(
      localStorage.getItem("exercises") || "[]"
    ) as Array<{
      tick: number;
      exercise: string;
      weight: number;
      reps: number;
    }>;

    exercises.push({
      tick: Date.now(),
      exercise: exercise.value,
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
    e.addEventListener("focus", () => e.value = "");
  }
  