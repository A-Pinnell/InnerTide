document.addEventListener("click", async event => {
    const target = event.target.closest(".journalContainer");

    console.log("click worked");

    if (target.classList.contains("journalContainer")) {
        var selectedJournal = document.querySelector(".isSelected");

        if (selectedJournal == null) {
            console.log("selectedJournal is NULL");
            return;
        }

        selectedJournal.classList.remove("isSelected");
        console.log("Removed isSelected Class From Previous Journal Entry");
        target.classList.add("isSelected");
        console.log("Added isSelected Class to Clicked Journal Entry");
    }
});
