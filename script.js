document.addEventListener("DOMContentLoaded", async () => {
    const TASKS_DB_NAME = "TaskManagerDB"; // Database for tasks
    const DROPDOWNS_DB_NAME = "DropdownValuesDB"; // Database for dropdown values
    const DB_VERSION = 2; // Incremented to trigger onupgradeneeded
    const TASKS_STORE_NAME = "tasks"; // Store for tasks
    const DROPDOWN_STORE_NAME = "dropdownValues"; // Store for dropdown values
    const SETTINGS_STORE_NAME = "settings"; // Store for settings like collapse state

    let tasksDB, dropdownsDB;

    // Open the tasks database
// Open the tasks database
	function openTasksDB() {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(TASKS_DB_NAME, DB_VERSION); // Use the updated version

			request.onupgradeneeded = (event) => {
				const db = event.target.result;

				// Create the tasks store if it doesn't exist
				if (!db.objectStoreNames.contains(TASKS_STORE_NAME)) {
					db.createObjectStore(TASKS_STORE_NAME, { keyPath: "project" });
				}
				
				// Create settings store if it doesn't exist
				if (!db.objectStoreNames.contains(SETTINGS_STORE_NAME)) {
					db.createObjectStore(SETTINGS_STORE_NAME, { keyPath: "id" });
				}
			};

			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	}

	// Open the dropdown values database
	function openDropdownsDB() {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(DROPDOWNS_DB_NAME, DB_VERSION); // Use the updated version

			request.onupgradeneeded = (event) => {
				const db = event.target.result;

				// Create the dropdown values store if it doesn't exist
				if (!db.objectStoreNames.contains(DROPDOWN_STORE_NAME)) {
					db.createObjectStore(DROPDOWN_STORE_NAME, { keyPath: "type" });
				}
			};

			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	}



    // Save tasks to IndexedDB
    async function saveTasks(tasks) {
        try {
            tasksDB = tasksDB || await openTasksDB();
            const tx = tasksDB.transaction(TASKS_STORE_NAME, "readwrite");
            const store = tx.objectStore(TASKS_STORE_NAME);

            // Clear existing records first to avoid data inconsistency
            const clearRequest = store.clear();
            
            await new Promise((resolve, reject) => {
                clearRequest.onsuccess = () => resolve();
                clearRequest.onerror = () => reject(clearRequest.error);
            });

            // Now add all tasks for each project
            const promises = Object.keys(tasks).map(project => {
                return new Promise((resolve, reject) => {
                    const request = store.put({ project, tasks: tasks[project] });
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            });

            // Wait for all put operations to complete
            await Promise.all(promises);
            
            // Wait for transaction to complete
            return new Promise((resolve, reject) => {
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        } catch (error) {
            console.error("Error saving tasks:", error);
            throw error;
        }
    }

    // Load tasks from IndexedDB
    async function loadTasks() {
        try {
            tasksDB = tasksDB || await openTasksDB();
            const tx = tasksDB.transaction(TASKS_STORE_NAME, "readonly");
            const store = tx.objectStore(TASKS_STORE_NAME);
            const request = store.getAll();

            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    console.log("Tasks loaded from DB:", request.result);
                    resolve(request.result);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error("Error loading tasks:", error);
            return [];
        }
    }
    
    // Save collapsed state to IndexedDB
    async function saveCollapsedState(projectsCollapsed) {
        try {
            tasksDB = tasksDB || await openTasksDB();
            const tx = tasksDB.transaction(SETTINGS_STORE_NAME, "readwrite");
            const store = tx.objectStore(SETTINGS_STORE_NAME);
            
            store.put({ id: "collapsedProjects", projects: projectsCollapsed });
            
            return new Promise((resolve, reject) => {
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        } catch (error) {
            console.error("Error saving collapsed state:", error);
            throw error;
        }
    }
    
    // Load collapsed state from IndexedDB
    async function loadCollapsedState() {
        try {
            tasksDB = tasksDB || await openTasksDB();
            const tx = tasksDB.transaction(SETTINGS_STORE_NAME, "readonly");
            const store = tx.objectStore(SETTINGS_STORE_NAME);
            const request = store.get("collapsedProjects");
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result ? request.result.projects : []);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error("Error loading collapsed state:", error);
            return [];
        }
    }

    // Format date to DD/MM/YYYY
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB'); // Use en-GB locale for DD/MM/YYYY format
    }

    // Import tasks into the UI
    async function importTasks() {
        try {
            const data = await loadTasks();
            document.getElementById("taskContainer").innerHTML = ""; // Clear existing tasks
            
            // Load collapsed projects state
            const collapsedProjects = await loadCollapsedState();

            console.log("Importing tasks:", data);
            if (!data || !data.length) {
                console.log("No tasks to import");
                return;
            }

            data.forEach(({ project, tasks }, index) => {
                if (!project || !tasks || !Array.isArray(tasks)) {
                    console.error("Invalid project data:", { project, tasks });
                    return;
                }

                if (index > 0) {
                    document.getElementById("taskContainer").appendChild(document.createElement("hr"));
                }

                let projectSection = document.createElement("div");
                projectSection.id = project;
                projectSection.classList.add("project-section");
                
                // Apply collapsed class if project was collapsed
                if (collapsedProjects.includes(project)) {
                    projectSection.classList.add("collapsed");
                }
                
                projectSection.innerHTML = `<h2>${project} <button class="collapse-btn">Toggle Completed</button></h2><div class="task-list"></div>`;
                document.getElementById("taskContainer").appendChild(projectSection);

                const taskList = projectSection.querySelector(".task-list");

                // Sort tasks: incomplete first, completed last
                const sortedTasks = tasks.sort((a, b) => (a.completed === b.completed) ? 0 : a.completed ? 1 : -1);
                sortedTasks.forEach(task => {
                    addTaskElement(taskList, task, project);
                });

                // Add collapse/uncollapse functionality
                const collapseBtn = projectSection.querySelector(".collapse-btn");
                collapseBtn.addEventListener("click", () => {
                    projectSection.classList.toggle("collapsed");
                    const completedTasks = taskList.querySelectorAll(".task-item.completed");
                    completedTasks.forEach(task => {
                        task.style.display = projectSection.classList.contains("collapsed") ? "none" : "flex";
                    });
                    
                    // Update collapsed state in IndexedDB
                    updateCollapsedState();
                });
                
                // Apply initial collapsed state if needed
                if (projectSection.classList.contains("collapsed")) {
                    const completedTasks = taskList.querySelectorAll(".task-item.completed");
                    completedTasks.forEach(task => {
                        task.style.display = "none";
                    });
                }
            });
        } catch (error) {
            console.error("Error importing tasks:", error);
        }
    }
    
    // Update the collapsed state in IndexedDB
    async function updateCollapsedState() {
        const collapsedProjects = [];
        document.querySelectorAll(".project-section").forEach(section => {
            if (section.classList.contains("collapsed")) {
                collapsedProjects.push(section.id);
            }
        });
        
        await saveCollapsedState(collapsedProjects);
    }

	function addTaskElement(taskList, task, project) {
		const taskItem = document.createElement("div");
		taskItem.classList.add("task-item");
		if (task.completed) taskItem.classList.add("completed");

		// Assign color based on priority
		let priorityColor = "black";
		if (task.priority === "High") priorityColor = "red";
		if (task.priority === "Medium") priorityColor = "green";
		if (task.priority === "Low") priorityColor = "orange";
		
		// Format the due date
		const currentDate = new Date();
		const dueDate = new Date(task.dueDate);
		const timeDiff = dueDate - currentDate;
		const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

		// Determine due date color (red if within 7 days)
		const dueDateColor = daysLeft <= 7 ? "red" : "black";

		// Check if addedDate exists, if not use current date
		const addedDate = task.addedDate || new Date().toLocaleDateString();

		// Highlight "Note" in yellow
		const taskTypeClass = task.taskType === "Note" ? "note-highlight" : "";

		taskItem.innerHTML = `
			<div class="task-info">
				<span class="task-main-text ${taskTypeClass}">
					${task.taskType || ""} <span class="person-name">${task.person || ""}</span> - ${task.taskText || ""}
				</span>
				<div>
					<button class="complete-btn">✔</button>
					<button class="delete-btn">✖</button>
				</div>
			</div>
			<div class="task-details">
				Priority: <span style="color:${priorityColor}">${task.priority || "None"}</span>, Due: <span style="color:${dueDateColor}">${task.dueDate}</span>
			</div>
			<div class="task-notes">
				<textarea class="notes-textarea" placeholder="Add updates or notes...">${task.notes || ""}</textarea>
			</div>
			<div class="task-added-date">Added on: ${addedDate}</div>
		`;

		taskList.appendChild(taskItem);

		// Mark task as completed
		taskItem.querySelector(".complete-btn").addEventListener("click", () => {
			taskItem.classList.toggle("completed");
			
			// If project is collapsed, hide completed tasks
			const projectSection = document.getElementById(project);
			if (projectSection.classList.contains("collapsed") && taskItem.classList.contains("completed")) {
				taskItem.style.display = "none";
			}
			
			exportTasks();
		});

		// Delete task and remove empty project section
		taskItem.querySelector(".delete-btn").addEventListener("click", () => {
			taskItem.remove();
			checkAndRemoveProject(project);
			exportTasks();
		});

		// Save notes when the textarea loses focus
		const notesTextarea = taskItem.querySelector(".notes-textarea");
		notesTextarea.addEventListener("blur", () => {
			task.notes = notesTextarea.value; // Update the task's notes
			exportTasks(); // Save the updated task to the database
		});
		


		// Save on Enter Key
		notesTextarea.addEventListener("keydown", (event) => {
			if (event.key === "Enter" && !event.shiftKey) {
				event.preventDefault(); // Prevent newline in textarea
				notesTextarea.blur(); // Trigger the blur event to save notes
			}
		});

		// Apply display style if project is collapsed and task is completed
		const projectSection = document.getElementById(project);
		if (projectSection.classList.contains("collapsed") && taskItem.classList.contains("completed")) {
			taskItem.style.display = "none";
		}
	}


    // Function to check if a project has no tasks left and remove it
    async function checkAndRemoveProject(project) {
        const projectSection = document.getElementById(project);
        if (projectSection) {
            const taskList = projectSection.querySelector(".task-list");
            if (taskList.children.length === 0) {
                projectSection.remove();
                await removeProjectFromDB(project); // Remove from IndexedDB
                
                // Update collapsed state to remove this project
                await updateCollapsedState();
            }
        }
    }

    // Function to remove project from IndexedDB
    async function removeProjectFromDB(project) {
        try {
            const db = await openTasksDB();
            const tx = db.transaction(TASKS_STORE_NAME, "readwrite");
            const store = tx.objectStore(TASKS_STORE_NAME);

            store.delete(project); // Remove the project from the database
            
            return new Promise((resolve, reject) => {
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        } catch (error) {
            console.error("Error removing project from DB:", error);
            throw error;
        }
    }

	async function exportTasks() {
		const tasks = {};
		document.querySelectorAll(".project-section").forEach(projectSection => {
			const projectName = projectSection.id;
			const taskItems = projectSection.querySelectorAll(".task-item");
			
			if (!taskItems.length) return;
			
			tasks[projectName] = Array.from(taskItems).map(taskItem => {
				try {
					// Extract person name from the span with class "person-name"
					const personSpan = taskItem.querySelector(".person-name");
					const person = personSpan ? personSpan.textContent.trim() : "";
					
					// Extract task type and text using a more robust approach
					const taskInfoSpan = taskItem.querySelector(".task-main-text");
					let taskType = "", taskText = "";
					
					if (taskInfoSpan) {
						const taskInfo = taskInfoSpan.textContent.trim();
						const dashIndex = taskInfo.indexOf("-");
						
						if (dashIndex > -1) {
							const beforeDash = taskInfo.substring(0, dashIndex).trim();
							taskType = beforeDash.replace(person, "").trim();
							taskText = taskInfo.substring(dashIndex + 1).trim();
						} else {
							// Fallback if no dash is found
							taskText = taskInfo;
						}
					}
					
					// Extract priority from the task details
					const detailsElement = taskItem.querySelector(".task-details");
					let priority = "None";
					
					if (detailsElement) {
						const priorityText = detailsElement.textContent;
						const priorityStart = priorityText.indexOf("Priority:") + 9;
						const priorityEnd = priorityText.indexOf(",", priorityStart);
						
						if (priorityStart > 8 && priorityEnd > priorityStart) {
							priority = priorityText.substring(priorityStart, priorityEnd).trim();
						}
					}
					
					// Extract due date from the task details
					const dueDate = taskItem.querySelector(".task-details").textContent.split("Due:")[1].trim();

					// Extract notes from the task notes
					const notesElement = taskItem.querySelector(".task-notes textarea");
					const notes = notesElement ? notesElement.value.trim() : ""; // Use .value for textarea
					
					// Extract added date if it exists
					const addedDateElement = taskItem.querySelector(".task-added-date");
					const addedDate = addedDateElement ? 
						addedDateElement.textContent.replace("Added on:", "").trim() : 
						formatDate(new Date());
					
					return {
						taskType,
						person,
						taskText,
						priority,
						dueDate,
						notes, // Ensure notes are included
						addedDate,
						completed: taskItem.classList.contains("completed"),
					};
				} catch (error) {
					console.error("Error extracting task data:", error);
					return {
						taskType: "Error",
						taskText: "Error parsing task",
						priority: "None",
						dueDate: "",
						notes: "",
						addedDate: formatDate(new Date()),
						completed: false
					};
				}
			});
		});

		console.log("Exporting tasks:", tasks);
		await saveTasks(tasks);
	}

    // Save dropdown values to IndexedDB
    async function saveDropdownValues(type, value) {
        if (!value.trim()) return;
        
        try {
            dropdownsDB = dropdownsDB || await openDropdownsDB();
            const tx = dropdownsDB.transaction(DROPDOWN_STORE_NAME, "readwrite");
            const store = tx.objectStore(DROPDOWN_STORE_NAME);

            // Get existing values for the type (taskTypes, people, or projects)
            const request = store.get(type);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    const existingValues = request.result ? request.result.values : [];
                    if (!existingValues.includes(value)) {
                        existingValues.push(value);
                        const putRequest = store.put({ type, values: existingValues });
                        
                        putRequest.onsuccess = () => resolve();
                        putRequest.onerror = () => reject(putRequest.error);
                    } else {
                        resolve();
                    }
                };
                
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error("Error saving dropdown values:", error);
            throw error;
        }
    }

    // Load dropdown values from IndexedDB
    async function loadDropdownValues(type) {
        try {
            dropdownsDB = dropdownsDB || await openDropdownsDB();
            const tx = dropdownsDB.transaction(DROPDOWN_STORE_NAME, "readonly");
            const store = tx.objectStore(DROPDOWN_STORE_NAME);
            const request = store.get(type);

            return new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result ? request.result.values : []);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error("Error loading dropdown values:", error);
            return [];
        }
    }

    // Function to update dropdown menus with new values
    async function updateDropdowns() {
        try {
            // Load updated values from IndexedDB
            const taskTypes = await loadDropdownValues("taskTypes");
            const people = await loadDropdownValues("people");
            const projects = await loadDropdownValues("projects");

            // Get the datalist elements
            const taskTypeList = document.getElementById("taskTypes");
            const peopleList = document.getElementById("peopleList");
            const projectsList = document.getElementById("projectsList");

            // Clear existing options
            taskTypeList.innerHTML = "";
            peopleList.innerHTML = "";
            projectsList.innerHTML = "";

            // Populate task types datalist
            taskTypes.forEach(type => {
                const option = document.createElement("option");
                option.value = type;
                taskTypeList.appendChild(option);
            });

            // Populate people datalist
            people.forEach(person => {
                const option = document.createElement("option");
                option.value = person;
                peopleList.appendChild(option);
            });

            // Populate projects datalist
            projects.forEach(project => {
                const option = document.createElement("option");
                option.value = project;
                projectsList.appendChild(option);
            });
        } catch (error) {
            console.error("Error updating dropdowns:", error);
        }
    }

    // Function to delete the tasks database
    async function deleteTasksDB() {
        const confirmDelete = confirm("Are you sure you want to delete all tasks? This cannot be undone.");
        if (!confirmDelete) return;
        
        const request = indexedDB.deleteDatabase(TASKS_DB_NAME);
        request.onsuccess = () => {
            alert("Tasks database deleted successfully!");
            location.reload(); // Reload the page to reflect changes
        };
        request.onerror = () => {
            alert("Error deleting tasks database!");
        };
    }

    // Function to delete the dropdown values database
    async function deleteDropdownsDB() {
        const confirmDelete = confirm("Are you sure you want to delete all dropdown values? This cannot be undone.");
        if (!confirmDelete) return;
        
        const request = indexedDB.deleteDatabase(DROPDOWNS_DB_NAME);
        request.onsuccess = () => {
            alert("Dropdown values database deleted successfully!");
            location.reload(); // Reload the page to reflect changes
        };
        request.onerror = () => {
            alert("Error deleting dropdown values database!");
        };
    }

    // Add event listeners for the delete buttons
    document.getElementById("deleteTasksDB").addEventListener("click", deleteTasksDB);
    document.getElementById("deleteDropdownsDB").addEventListener("click", deleteDropdownsDB);

    // Add task event listener
    document.getElementById("addTask").addEventListener("click", async () => {
        const taskType = document.getElementById("taskType").value.trim();
        const person = document.getElementById("people").value.trim();
        const project = document.getElementById("projects").value.trim();
        const priority = document.getElementById("priority").value.trim();
        const dueDate = document.getElementById("dueDate").value.trim();
        const taskDescription = document.getElementById("taskDescription").value.trim();
        const notes = document.getElementById("otherNotes").value.trim();

        if (!taskDescription || !project || !taskType) {
            alert("Task Type, Task Description, and Project are required!");
            return;
        }

        try {
            // Save dropdown values to IndexedDB
            await saveDropdownValues("taskTypes", taskType);
            await saveDropdownValues("people", person);
            await saveDropdownValues("projects", project);

            // Update dropdown menus with new values
            await updateDropdowns();

            // Add the new task to the UI
            const addedDate = formatDate(new Date()); // Get the current date in DD/MM/YYYY format
            let projectSection = document.getElementById(project);
            
            if (!projectSection) {
                // If the container is empty, don't add an HR
                const needsHr = document.querySelectorAll(".project-section").length > 0;
                if (needsHr) {
                    document.getElementById("taskContainer").appendChild(document.createElement("hr"));
                }
                
                projectSection = document.createElement("div");
                projectSection.id = project;
                projectSection.classList.add("project-section");
                projectSection.innerHTML = `<h2>${project} <button class="collapse-btn">Toggle Completed</button></h2><div class="task-list"></div>`;
                document.getElementById("taskContainer").appendChild(projectSection);
                
                // Add collapse/uncollapse functionality to new project
                const collapseBtn = projectSection.querySelector(".collapse-btn");
                collapseBtn.addEventListener("click", () => {
                    projectSection.classList.toggle("collapsed");
                    const completedTasks = projectSection.querySelectorAll(".task-item.completed");
                    completedTasks.forEach(task => {
                        task.style.display = projectSection.classList.contains("collapsed") ? "none" : "flex";
                    });
                    
                    // Update collapsed state in IndexedDB
                    updateCollapsedState();
                });
            }

            const taskList = projectSection.querySelector(".task-list");
            const newTask = { taskType, person, taskText: taskDescription, priority, dueDate, notes, completed: false, addedDate };
            addTaskElement(taskList, newTask, project);

            // Save tasks to IndexedDB
            await exportTasks();
            
            // Clear the form
            document.getElementById("taskType").value = "";
            document.getElementById("people").value = "";
            // Keep the project field filled
            document.getElementById("priority").value = "Medium";
            document.getElementById("dueDate").value = "";
            document.getElementById("taskDescription").value = "";
            document.getElementById("otherNotes").value = "";
            
            // Focus back on task type for quick entry
            document.getElementById("taskType").focus();
        } catch (error) {
            console.error("Error adding task:", error);
            alert("Error adding task. Please try again.");
        }
    });

    // Load tasks and dropdown values when the page loads
    await importTasks();
    await updateDropdowns();

    // Function to export a database as a JSON file
    async function exportDatabase(dbName, storeName, fileName) {
        try {
            const db = await openDB(dbName);
            const tx = db.transaction(storeName, "readonly");
            const store = tx.objectStore(storeName);
            const request = store.getAll();

            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    const data = request.result;
                    if (!data || !data.length) {
                        alert(`No data found in ${storeName}`);
                        return resolve();
                    }

                    // Convert to JSON string
                    const jsonString = JSON.stringify(data, null, 2);

                    // Create a downloadable file
                    const blob = new Blob([jsonString], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = fileName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);

                    resolve();
                };

                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error("Error exporting database:", error);
            alert("Error exporting database. Please try again.");
        }
    }

    // Open IndexedDB
    function openDB(name) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(name);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Function to export both databases
    async function exportBothDatabases() {
        try {
            await exportDatabase(TASKS_DB_NAME, TASKS_STORE_NAME, "tasks.json");
            await exportDatabase(DROPDOWNS_DB_NAME, DROPDOWN_STORE_NAME, "dropdowns.json");
        } catch (error) {
            console.error("Error exporting databases:", error);
            alert("Error exporting databases. Please try again.");
        }
    }

    // Add event listener to export button
    document.getElementById("exportDBs").addEventListener("click", exportBothDatabases);

    async function importDatabase() {
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

                    // Check for valid structure
                    if (!Array.isArray(jsonData)) {
                        alert("Error: Invalid JSON structure. Expected an array.");
                        return;
                    }

                    // Clear existing tasks before import
                    document.getElementById("taskContainer").innerHTML = "";
                    
                    // Process each project in the JSON and render the tasks
                    const formattedTasks = {}; // Prepare tasks for saving
                    for (const projectData of jsonData) {
                        const projectName = projectData.project;
                        const tasks = projectData.tasks;

                        if (!projectName || !tasks || !Array.isArray(tasks)) {
                            console.error("Invalid project data:", projectData);
                            continue;
                        }

                        // Save tasks by project name
                        formattedTasks[projectName] = tasks;

                        // Render tasks into the UI
                        let projectSection = document.getElementById(projectName);
                        if (!projectSection) {
                            // If the container is empty, don't add an HR
                            const needsHr = document.querySelectorAll(".project-section").length > 0;
                            if (needsHr) {
                                document.getElementById("taskContainer").appendChild(document.createElement("hr"));
                            }
                            
                            projectSection = document.createElement("div");
                            projectSection.id = projectName;
                            projectSection.classList.add("project-section");
                            projectSection.innerHTML = `<h2>${projectName} <button class="collapse-btn">Toggle Completed</button></h2><div class="task-list"></div>`;
                            document.getElementById("taskContainer").appendChild(projectSection);
                            
                            // Add collapse/uncollapse functionality to new project
                            const collapseBtn = projectSection.querySelector(".collapse-btn");
                            collapseBtn.addEventListener("click", () => {
                                projectSection.classList.toggle("collapsed");
                                const completedTasks = projectSection.querySelectorAll(".task-item.completed");
                                completedTasks.forEach(task => {
                                    task.style.display = projectSection.classList.contains("collapsed") ? "none" : "flex";
                                });
                                
                                // Update collapsed state in IndexedDB
                                updateCollapsedState();
                            });
                        }

                        const taskList = projectSection.querySelector(".task-list");

                        tasks.forEach(task => {
                            addTaskElement(taskList, task, projectName);
                        });
                    }

                    // Save imported tasks into IndexedDB
                    await saveTasks(formattedTasks);

                    alert("Database imported successfully and tasks saved!");
                } catch (error) {
                    console.error("Failed to import database:", error);
                    alert("Error: Invalid JSON format or structure.");
                }
            };
            reader.readAsText(file);
        };
        fileInput.click();
    }

    // Add event listener for the import button
    document.getElementById("importDatabase").addEventListener("click", importDatabase);
});
