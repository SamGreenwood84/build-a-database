const inquirer = require("inquirer");
const mysql = require("mysql2/promise");
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const connectionPool = mysql.createPool({
  host: "127.0.0.1",
  user: "root",
  password: "1111",
  database: "employee_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

//Function to display Figlet message
function displaySuccessMessage() {
  try {
    const figletText = fs.readFileSync
    execSync(`figlet EmployeeDatabase ${figletText}`, { stdio: "inherit" });
  } catch (error) {
    console.error("Error displaying Figlet message:", error.message);
  }
}

displaySuccessMessage();

console.log(".............................................");
console.log("Welcome to Your Employee Database!");
console.log("Enter employee details to add to the database.");

//Questions for employee and manager names
const commonEmployeeQuestions = [
  {
    type: "input",
    name: "firstName",
    message: "Enter their first name:",
    validate: function (input) {
      return input.trim() !== "" || "Invalid entry";
    },
  },
  {
    type: "input",
    name: "lastName",
    message: "Enter their last name:",
    validate: function (input) {
      return input.trim() !== "" || "Invalid entry";
    },
  },
];

//Function to exit or start over after tables or successful entries
async function askExitOrStartOver() {
  const { exitOrStartOver } = await inquirer.prompt([
    {
      type: "list",
      name: "exitOrStartOver",
      message: "Do you want to exit or start over?",
      choices: ["Exit", "Start Over"],
    },
  ]);

  if (exitOrStartOver === "Exit") {
    console.log("Exiting the application. Goodbye!");
    process.exit(0); // Exit the application with a success code
  } else {
    console.log("Starting over...");
    await startInput();
  }
}
//Questions for employee table
const employeeQuestions = [
  ...commonEmployeeQuestions,
  {
    type: "input",
    name: "title",
    message: "Enter their role title:",
    validate: function (input) {
      return input.trim() !== "" || "Enter a valid role title";
    },
  },
  {
    type: "input",
    name: "salary",
    message: "Enter the new role salary:",
    validate: function (input) {
      return /^\d+$/.test(input) || "Please enter a valid salary (numeric).";
    },
  },
  {
    type: "input",
    name: "managerId",
    message: "Enter the employee's manager ID (optional, press Enter to skip):",
    validate: function (input) {
      return (
        input === "" ||
        /^\d+$/.test(input) ||
        "Please enter a valid manager ID (numeric) or leave it empty."
      );
    },
  },
];
//Questions for manager table
const managerQuestions = [
  ...commonEmployeeQuestions,
  {
    type: "input",
    name: "departmentName",
    message: "Enter the manager's department name:",
    validate: function (input) {
      return input.trim() !== "" || "Invalid entry";
    },
  },
  {
    type: "input",
    name: "roleId",
    message: "Enter the manager's role ID:",
    validate: function (input) {
      return /^\d+$/.test(input) || "Please enter a valid role ID (numeric).";
    },
  },
];
//Questions for role table
const roleQuestions = [
  {
    type: "input",
    name: "roleTitle",
    message: "Enter the new role name:",
    validate: function (input) {
      return input.trim() !== "" || "Invalid entry";
    },
  },
  {
    type: "input",
    name: "roleSalary",
    message: "Enter the new role salary:",
    validate: function (input) {
      const isValid = /^\d+$/.test(input) && parseFloat(input) > 0;
      return isValid || "Please enter a valid positive salary (numeric).";
    },
  },
  {
    type: "input",
    name: "departmentId",
    message: "Enter the manager's department ID:",
    validate: function (input) {
      return (
        /^\d+$/.test(input) || "Please enter a valid department ID (numeric)."
      );
    },
  },
];
//Entry questions
const entryTypeQuestions = [
  {
    type: "list",
    name: "entryType",
    message: "Are you entering an employee, manager, department or role?",
    choices: ["Employee", "Manager", "Department", "Role"],
  },
];
//function to insert employee data input to employee table
async function insertEmployee(employeeData) {
  try {
    const [existingEmployee] = await connectionPool.execute(
      "SELECT id FROM employees WHERE first_name = ? AND last_name = ? AND title = ? AND salary = ? AND manager_id = ?",
      [
        employeeData.firstName,
        employeeData.lastName,
        employeeData.title,
        employeeData.salary,
        employeeData.managerId,
      ]
    );

    if (existingEmployee.length) {
      console.log(`Employee already exists with ID: ${existingEmployee[0].id}`);
      return;
    }

    // Validate manager_id before inserting
    const managerId = parseInt(employeeData.managerId, 10);
    if (isNaN(managerId)) {
      console.error(
        "Invalid manager_id. Please provide a valid integer value."
      );
      return;
    }

    const [rows] = await connectionPool.execute(
      "INSERT INTO employees (first_name, last_name, title, salary, manager_id) VALUES (?, ?, ?, ?, ?)",
      [
        employeeData.firstName,
        employeeData.lastName,
        employeeData.title,
        employeeData.salary,
        managerId,
      ]
    );

    console.log(
      `Inserted employee: ${employeeData.firstName} ${employeeData.lastName} as ${employeeData.title} with ID: ${rows.insertId}`
    );
    await askExitOrStartOver(); // Ask the user if they want to exit or start over
  } catch (error) {
    console.error("Error inserting employee:", error);
  }
}
//Function to insert manager input to manager table
async function insertManager(firstName, lastName, departmentName, roleId) {
  try {
    const [rows] = await connectionPool.execute(
      "INSERT INTO managers (first_name, last_name, department_name, role_id) VALUES (?, ?, ?, ?)",
      [firstName, lastName, departmentName, roleId]
    );

    console.log(
      `Inserted manager: ${firstName} ${lastName} with ID: ${rows.insertId}`
    );
    displayEntryDetails({ firstName, lastName, departmentName, roleId });
    await askExitOrStartOver();
  } catch (error) {
    console.error("Error inserting manager:", error);
  }
}
//Function to insert role data input to riole table
async function insertRole(title, salary, departmentId) {
  try {
    const [existingRole] = await connectionPool.execute(
      "SELECT id FROM roles WHERE title = ? AND salary = ? AND department_id = ?",
      [title, salary, departmentId]
    );

    if (existingRole.length) {
      console.log(`Role already exists with ID: ${existingRole[0].id}`);
      return existingRole[0].id;
    }

    const [rows] = await connectionPool.execute(
      "INSERT INTO roles (title, salary, department_id) VALUES (?, ?, ?)",
      [title, salary, departmentId]
    );

    console.log(
      `Successful role entry! New role: ${title} with ID: ${rows.insertId}`
    );
    await askExitOrStartOver();
    return rows.insertId;
  } catch (error) {
    console.error("Error inserting role:", error);
    return null;
  }
}
//Function to insert department data input into department table
async function insertDepartment(departmentName) {
  try {
    if (!departmentName) {
      console.log("Department name is required.");
      return null;
    }

    const [existingDepartment] = await connectionPool.execute(
      "SELECT id FROM departments WHERE department_name = ?",
      [departmentName]
    );

    if (existingDepartment.length) {
      console.log(
        `Department already exists with ID: ${existingDepartment[0].id}`
      );
      return existingDepartment[0].id;
    }

    const [rows] = await connectionPool.execute(
      "INSERT INTO departments (department_name) VALUES (?)",
      [departmentName]
    );

    console.log(
      `Inserted new department: ${departmentName} with ID: ${rows.insertId}`
    );
    console.log("Successful department entry!");
    await askExitOrStartOver();
    return rows.insertId;
  } catch (error) {
    console.error("Error inserting department:", error);
    return null;
  }
}
//function to display the entry details of a successful entry
function displayEntryDetails(data) {
  console.log(`Congratulations! You've made a successful entry!\n`);
  console.log("Entry Details:");
  console.log("--------------");
  console.log(`First Name: ${data.firstName}`);
  console.log(`Last Name: ${data.lastName}`);
  console.log(`Department Name: ${data.departmentName || "N/A"}`);
  console.log(`Role ID: ${data.roleId || "N/A"}`);
  console.log("--------------\n");
}
//Function to display the manager name instead of the manager id when viewed in tables
async function getManagerName(managerId) {
  const [managerRow] = await connectionPool.execute(
    "SELECT first_name, last_name FROM managers WHERE id = ?",
    [managerId]
  );
  return managerRow.length
    ? `${managerRow[0].first_name} ${managerRow[0].last_name}`
    : null;
}

async function startManagerInput() {
  const { firstName, lastName, departmentName, roleId } = await inquirer.prompt(
    managerQuestions
  );

  const [roleRow] = await connectionPool.execute(
    "SELECT title FROM roles WHERE id = ?",
    [roleId]
  );
  const roleTitle = roleRow.length ? roleRow[0].title : null;
  console.log(`Role: ${roleTitle || "Unknown"}`);

  await insertManager(firstName, lastName, departmentName, roleId);
}

async function startEmployeeInput() {
  const employeeData = await inquirer.prompt(employeeQuestions);
  console.log(employeeData);

  insertEmployee(employeeData);
}
//Function to start role questions in command line
async function startRoleInput() {
  const roleData = await inquirer.prompt([
    {
      type: "input",
      name: "roleTitle",
      message: "Enter the new role title:",
      validate: function (input) {
        return input.trim() !== "" || "Invalid entry";
      },
    },
    {
      type: "input",
      name: "roleSalary",
      message: "Enter the new role salary:",
      validate: function (input) {
        const isValid =
          /^\d+(\.\d{1,2})?$/.test(input) && parseFloat(input) > 0;
        return isValid || "Please enter a valid positive salary (numeric).";
      },
    },
  ]);

  const departmentName = await inquirer.prompt([
    {
      type: "input",
      name: "departmentName",
      message: "Enter the department ID for the role:",
      validate: function (input) {
        return input.trim() !== "" || "Invalid entry";
      },
    },
  ]);

  roleData.departmentId = departmentName.departmentName;

  const isConfirmed = await confirmDetails(roleData);

  if (isConfirmed) {
    const roleId = await insertRole(
      roleData.roleTitle,
      roleData.roleSalary,
      roleData.departmentId
    );
    if (roleId) {
      console.log(`Inserted role with ID: ${roleId}`);
    } else {
      console.log("Error inserting role.");
    }
  } else {
    console.log("Entry canceled by user.");
  }
}
//Function to start department questions in the command line
async function startDepartmentInput() {
  const departmentData = await inquirer.prompt([
    {
      type: "input",
      name: "departmentName",
      message: "Enter the new department name:",
      validate: function (input) {
        return input.trim() !== "" || "Invalid entry";
      },
    },
  ]);

  const isConfirmed = await confirmDetails(departmentData);

  if (isConfirmed) {
    const departmentId = await insertDepartment(departmentData.departmentName);
    if (departmentId) {
      console.log(`Inserted department with ID: ${departmentId}`);
    } else {
      console.log("Error inserting department.");
    }
  } else {
    console.log("Entry canceled by user.");
  }
}
//Function to ask user what they want to do in the database
async function startInput() {
  const { usageType } = await inquirer.prompt([
    {
      type: "list",
      name: "usageType",
      message: "Are you viewing your database, making an entry, or editing?",
      choices: ["View", "Entry", "Edit"],
    },
  ]);

  if (usageType === "View") {
    await handleViewOptions();
  } else if (usageType === "Edit") {
    await handleEditOptions();
  } else {
    await startEntryProcess();
  }
}
//Function to view all the tables in the employee_db
async function handleViewOptions() {
  const viewOptions = [
    { name: "View All Tables", func: viewAllTables },
    { name: "View All Departments", func: viewAllDepartments },
    { name: "View All Roles", func: viewAllRoles },
    { name: "View All Employees", func: viewAllEmployees },
    { name: "View All Managers", func: viewAllManagers },
    { name: "View All Salaries", func: viewAllSalaries },
  ];

  const { viewChoice } = await inquirer.prompt([
    {
      type: "list",
      name: "viewChoice",
      message: "Choose an option to view:",
      choices: viewOptions.map((option) => option.name),
    },
  ]);

  const selectedOption = viewOptions.find(
    (option) => option.name === viewChoice
  );
  if (selectedOption && selectedOption.func) {
    await selectedOption.func();
  }
}
//Function view the choices of tables to edit
async function handleEditOptions() {
  const { editTableChoice } = await inquirer.prompt([
    {
      type: "list",
      name: "editTableChoice",
      message: "Choose a table to edit:",
      choices: ["Departments", "Roles", "Employees", "Managers"],
    },
  ]);

  console.log(`Editing ${editTableChoice}...`);

  switch (editTableChoice) {
    case "Departments":
      await editDepartments();
      break;
    case "Roles":
      await editRoles();
      break;
    case "Employees":
      await editEmployees();
      break;
    case "Managers":
      await editManagers();
      break;
    default:
      console.log("Invalid choice.");
      break;
  }
}

async function editTable(tableName) {
  // logic to edit the specified table
  await editEmployees();
  await editRoles();
  await editDepartments();
  await editManagers();
}

async function editDepartments() {
  try {
    const oldDepartmentData = await inquirer.prompt([
      {
        type: "input",
        name: "oldDepartmentId",
        message: "Enter the department ID you want to update:",
        validate: function (input) {
          return input.trim() !== "" || "Invalid entry";
        },
      },
    ]);

    const newDepartmentData = await inquirer.prompt([
      {
        type: "input",
        name: "newDepartmentName",
        message: "Enter the NEW department name:",
        validate: function (input) {
          return input.trim() !== "" || "Invalid entry";
        },
      },
    ]);

    const { oldDepartmentId, newDepartmentName } = {
      ...oldDepartmentData,
      ...newDepartmentData,
    };

    if (!oldDepartmentId || !newDepartmentName) {
      throw new Error("Department ID and new name are required.");
    }

    await connectionPool.execute(
      "UPDATE departments SET department_name = ? WHERE id = ?",
      [newDepartmentName, oldDepartmentId]
    );

    console.log(`Department with ID ${oldDepartmentId} updated successfully!`);
    await askExitOrStartOver();
  } catch (error) {
    console.error("Error editing departments:", error);
  }
}

async function editRoles() {
  try {
    const oldRoleData = await inquirer.prompt([
      {
        type: "input",
        name: "oldRoleId",
        message: "Enter the role ID you want to update:",
        validate: function (input) {
          return input.trim() !== "" || "Invalid entry";
        },
      },
    ]);

    const newRoleData = await inquirer.prompt([
      {
        type: "input",
        name: "newTitle",
        message: "Enter the NEW role title:",
        validate: function (input) {
          return input.trim() !== "" || "Invalid entry";
        },
      },
      {
        type: "input",
        name: "newSalary",
        message: "Enter the NEW role salary:",
        validate: function (input) {
          return /^\d+(\.\d{1,2})?$/.test(input) || "Invalid salary format";
        },
      },
    ]);

    const { oldRoleId, newTitle, newSalary } = {
      ...oldRoleData,
      ...newRoleData,
    };

    if (!oldRoleId || !newTitle || !newSalary) {
      throw new Error("Role ID, new title, and salary are required.");
    }

    await connectionPool.execute(
      "UPDATE roles SET title = ?, salary = ? WHERE id = ?",
      [newTitle, newSalary, oldRoleId]
    );

    console.log(`Role with ID ${oldRoleId} updated successfully!`);
    await askExitOrStartOver();
  } catch (error) {
    console.error("Error editing role:", error);
  }
}

async function editEmployees() {
  try {
    const oldEmployeeData = await inquirer.prompt([
      {
        type: "input",
        name: "oldEmployeeId",
        message: "Enter the employee ID you want to update:",
        validate: function (input) {
          return input.trim() !== "" || "Invalid entry";
        },
      },
    ]);

    const newEmployeeData = await inquirer.prompt([
      {
        type: "input",
        name: "newFirstName",
        message: "Enter the NEW first name:",
        validate: function (input) {
          return input.trim() !== "" || "Invalid entry";
        },
      },
      {
        type: "input",
        name: "newLastName",
        message: "Enter the NEW last name:",
        validate: function (input) {
          return input.trim() !== "" || "Invalid entry";
        },
      },
      {
        type: "input",
        name: "newRoleId",
        message: "Enter the NEW role ID:",
        validate: function (input) {
          return input.trim() !== "" || "Invalid entry";
        },
      },
    ]);

    const { oldEmployeeId, newFirstName, newLastName, newRoleId } = {
      ...oldEmployeeData,
      ...newEmployeeData,
    };

    if (!oldEmployeeId || !newFirstName || !newLastName || !newRoleId) {
      throw new Error(
        "Employee ID, new first name, last name, and role ID are required."
      );
    }

    await connectionPool.execute(
      "UPDATE employees SET first_name = ?, last_name = ?, role_id = ? WHERE id = ?",
      [newFirstName, newLastName, newRoleId, oldEmployeeId]
    );

    console.log(`Employee with ID ${oldEmployeeId} updated successfully!`);
    await askExitOrStartOver();
  } catch (error) {
    console.error("Error editing employee:", error);
  }
}

async function editManagers() {
  try {
    const oldManagerData = await inquirer.prompt([
      {
        type: "input",
        name: "oldManagerId",
        message: "Enter the manager ID you want to update:",
        validate: function (input) {
          return input.trim() !== "" || "Invalid entry";
        },
      },
    ]);

    const newManagerData = await inquirer.prompt([
      {
        type: "input",
        name: "newFirstName",
        message: "Enter the NEW first name:",
        validate: function (input) {
          return input.trim() !== "" || "Invalid entry";
        },
      },
      {
        type: "input",
        name: "newLastName",
        message: "Enter the NEW last name:",
        validate: function (input) {
          return input.trim() !== "" || "Invalid entry";
        },
      },
    ]);

    const { oldManagerId, newFirstName, newLastName } = {
      ...oldManagerData,
      ...newManagerData,
    };

    if (!oldManagerId || !newFirstName || !newLastName) {
      throw new Error(
        "Manager ID, new first name, and last name are required."
      );
    }

    await connectionPool.execute(
      "UPDATE managers SET first_name = ?, last_name = ? WHERE id = ?",
      [newFirstName, newLastName, oldManagerId]
    );

    console.log(`Manager with ID ${oldManagerId} updated successfully!`);
    await askExitOrStartOver();
  } catch (error) {
    console.error("Error editing manager:", error);
  }
}

async function startEntryProcess() {
  const { entryType } = await inquirer.prompt(entryTypeQuestions);

  if (entryType === "Employee") {
    await startEmployeeInput();
  } else if (entryType === "Manager") {
    await startManagerInput();
  } else if (entryType === "Department") {
    await startDepartmentInput();
  } else if (entryType === "Role") {
    await startRoleInput();
  }
}

async function confirmDetails(data) {
  console.log("\nPlease confirm the details below:");
  console.log("==================================");
  console.log(`First Name: ${data.firstName}`);
  console.log(`Last Name: ${data.lastName}`);
  console.log(`Department Name: ${data.departmentName || "N/A"}`);
  console.log(`Role ID: ${data.roleId || "N/A"}`);
  console.log("==================================");

  const { isConfirmed } = await inquirer.prompt([
    {
      type: "confirm",
      name: "isConfirmed",
      message: "Is the information correct?",
    },
  ]);

  return isConfirmed;
}

async function viewAllTables() {
  try {
    // View all departments
    const [departmentRows] = await connectionPool.execute(
      "SELECT * FROM departments"
    );
    console.log("\nAll Departments:");
    console.table(departmentRows);

    // View all roles
    const [roleRows] = await connectionPool.execute("SELECT * FROM roles");
    console.log("\nAll Roles:");
    console.table(roleRows);

    // View all employees
    const [employeeRows] = await connectionPool.execute(
      "SELECT * FROM employees"
    );
    console.log("\nAll Employees:");
    console.table(employeeRows);

    // View all managers
    const [managerRows] = await connectionPool.execute(
      "SELECT * FROM managers"
    );
    console.log("\nAll Managers:");
    console.table(managerRows);
    await askExitOrStartOver();
  } catch (error) {
    console.error("Error viewing tables:", error);
  }
}

async function viewAllDepartments() {
  try {
    const [rows] = await connectionPool.execute("SELECT * FROM departments");
    console.log("\nAll Departments:");
    console.table(rows);
    await askExitOrStartOver();
  } catch (error) {
    console.error("Error viewing departments:", error);
  }
}

async function viewAllRoles() {
  try {
    const [rows] = await connectionPool.execute("SELECT * FROM roles");
    console.log("\nAll Roles:");
    console.table(rows);
    await askExitOrStartOver();
  } catch (error) {
    console.error("Error viewing roles:", error);
  }
}

async function viewAllEmployees() {
  try {
    const [rows] = await connectionPool.execute("SELECT * FROM employees");
    console.log("\nAll Employees:");
    console.table(rows);
    await askExitOrStartOver();
  } catch (error) {
    console.error("Error viewing employees:", error);
  }
}

async function viewAllManagers() {
  try {
    const [rows] = await connectionPool.execute("SELECT * FROM managers");
    console.log("\nAll Managers:");
    console.table(rows);
    await askExitOrStartOver();
  } catch (error) {
    console.error("Error viewing managers:", error);
  }
}

async function viewAllSalaries() {
  try {
    const [rows] = await connectionPool.execute(
      "SELECT first_name, last_name, salary FROM employees"
    );
    console.log("\nAll Salaries:");
    console.table(rows);
    await askExitOrStartOver();
  } catch (error) {
    console.error("Error viewing salaries:", error);
  }
}

startInput();
