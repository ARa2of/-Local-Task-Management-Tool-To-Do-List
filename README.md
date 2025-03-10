# Local Task Management Tool

This is a local task management tool that allows you to manage your tasks. You can add, edit, and delete tasks. You can also mark tasks as completed. Additionally, this tool provides features to export and import your task database as JSON files, delete tasks, and clear dropdown menus.
![Screenshot of the Task Management Tool](Screenshot%202025-03-10%20010020.png)

## Features

* **Task Management:** Add, edit, delete, and mark tasks as completed.
* **Data Persistence:** Uses IndexedDB for local data storage.
* **Export/Import:** Export your entire task database as a JSON file and import it back.
* **Dropdown Management:** Clear dropdown menu values.
* **Delete Tasks:** Delete individual tasks.
* **Clear Database:** Clear all tasks from the database.
* **Project Collapsing:** Collapse and expand project task lists.

## How to use

1.  Open the `index.html` file in your browser.
2.  **Add a task:** Fill out the form and click the `Add Task` button.
3.  **Edit a task:** Click on the task description.
4.  **Delete a task:** Click the `x` button.
5.  **Mark a task as completed:** Click the checkmark button.
6.  **Export Database:** Click the "Export Database" button to download a JSON file of your tasks.
7.  **Import Database:** Click the "Import Database" button to select a JSON file and import tasks.
8.  **Clear Dropdowns:** Use the interface to clear dropdown menu values.
9.  **Clear Database:** Use the interface to clear all tasks.
10. **Collapse/Expand Project:** Click on the project header to collapse or expand its task list.

## How to install

1.  Clone the repository.
2.  Open the `index.html` file in your browser.

## How to contribute

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/add-new-feature`).
3.  Commit your changes (`git commit -am 'Add a new feature'`).
4.  Push to the branch (`git push origin feature/add-new-feature`).
5.  Create a pull request.

## Code Highlights:

* Uses IndexedDB for efficient local storage of tasks and dropdown values.
* Implements export and import functionality using JSON files.
    * The code includes the following function to import the database:
        ```javascript
        function importDatabase() {
            const fileInput = document.createElement("input");
            fileInput.type = "file";
            fileInput.accept = ".json";

            fileInput.onchange = async (event) => {
                const file = event.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const jsonData = JSON.parse(e.target.result);
                        // ... code to process and save imported tasks ...
                    } catch (error) {
                        // ... error handling ...
                    }
                };
                reader.readAsText(file);
            };
            fileInput.click();
        }
        ```
* Includes features to clear dropdowns and the entire database.
* Includes project collapsing functionality.
    * The code includes the following function to collapse and expand projects:
        ```javascript
        function setupProjectCollapsing(projectSection) {
            const projectHeader = projectSection.querySelector(".project-header");
            projectHeader.addEventListener("click", () => {
                projectSection.classList.toggle("collapsed");
                // ... code to update collapsed state ...
            });
        }
        ```
* Uses async functions for database operations.
* Database structure:
    * `TaskManagerDB`: Stores task data.
    * `DropdownValuesDB`: Stores dropdown menu values.
    * `Settings`: Stores settings like the collapse state of projects.

## License

[MIT](https://choosealicense.com/licenses/mit/)
