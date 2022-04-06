import { promiseMap } from "../lib/promiseMap.js";
import { authorize } from "./auth.js";
import {
  createFolder,
  copyFile,
  updatePermissionStudentFile,
  getIdsInsideFolder,
} from "./drive.js";
import {
  initSpreadsheet,
  writeSheetStudent,
  copyToNewSheet,
  alterSheetNameAndInfo,
} from "./sheet.js";
import sendStudentMail from "./mail.js";
import { logger } from "../utils/logger.js";
import { google } from "googleapis";

const operationsFailed = [];

async function getStudents(auth, id, amountOfStudents) {
  const sheetTitle = "Dashboard";
  const initRowStudents = 12;
  const lastRowStudents = parseInt(amountOfStudents) + initRowStudents;
  const request = {
    spreadsheetId: id,
    range: `${sheetTitle}!A${initRowStudents}:B${lastRowStudents}`,
    dateTimeRenderOption: "FORMATTED_STRING",
    valueRenderOption: "UNFORMATTED_VALUE",
    auth,
  };
  console.log(JSON.stringify(request, null, 2));
  const sheet = google.sheets("v4");

  try {
    const response = (await sheet.spreadsheets.values.get(request)).data;
    const studentsInfo = response.values.map(student => (
      {
        name: student[0],
        email: student[1],
      }
    ));

    return studentsInfo;
  } catch (error) {
    console.log("deu ruim em pegar os alunos", error?.message);
  }
}

async function uploadFilesStudents(
  auth,
  students,
  folderId,
  idSpreadsheetTemplate
) {
  async function createStudentComplete(student) {
    let studentName = student.name;
    let fileNameInDrive = `${studentName} - Controle de Presença`;

    try {
      const studentId = await copyFile(
        auth,
        idSpreadsheetTemplate,
        folderId,
        fileNameInDrive,
        operationsFailed
      );
      console.log(`Copy file ${fileNameInDrive} with success!`);

      await updatePermissionStudentFile(
        auth,
        studentId,
        studentName,
        operationsFailed
      );
      console.log(`Update permission ${studentName} with success!`);

      await writeSheetStudent(
        auth,
        studentId,
        studentName,
        student.email,
        operationsFailed
      );
      console.log(`Student ${studentName} file rewritten!`);
      // await sendStudentMail(student.name, student.email, studentId);
    } catch (error) {
      logger.info(
        `Error in process of student ${studentName} error: ${error?.message}`
      );
      // console.log("Erro no processo geral")
    }
  }

  return promiseMap(students, createStudentComplete, { concurrency: 5 }); // GoogleAPI only accepts 10 queries per second (QPS), therefore, concurrency: 5 is a safe number.
}

async function createNewPage(auth, arrayFilesId, templateSheet, pageName) {
  async function updateStudentsFiles(file) {
    try {
      await copyToNewSheet(file, templateSheet);
      await alterSheetNameAndInfo(auth, file, pageName);
    } catch (err) {
      throw new Error(`Error in process of file ${file.name}`, err?.message);
    }
  }

  return promiseMap(arrayFilesId, updateStudentsFiles, { concurrency: 5 }); // GoogleAPI only accepts 10 queries per second (QPS), therefore, concurrency: 5 is a safe number.
}

export async function execute(
  idSpreadsheetStudents,
  idSpreadsheetTemplate,
  amountStudents,
  className,
  token
) {
  const auth = await authorize(token);
  console.log("Success on authenticate!");

  const folderId = await createFolder(auth, className);
  console.log("Creating class folder!");

  const students = await getStudents(auth, idSpreadsheetStudents, amountStudents);
  console.log("Loading students with success!");

  await uploadFilesStudents(auth, students, folderId, idSpreadsheetTemplate);
  console.log("Upload files each student");
  console.log("Done!");
}

export async function executeUpdate(folderId, idSpreadsheet, pageName, token) {
  const auth = await authorize(token);
  console.log("Success on authenticate!");

  const templateSheet = await initSpreadsheet(auth, idSpreadsheet, pageName);
  console.log("Success on loading page!");

  const {
    data: { files: arrayFiles },
  } = await getIdsInsideFolder(auth, folderId);
  console.log("Success on getting files id!");

  await createNewPage(auth, arrayFiles, templateSheet, pageName);
  console.log("Done!");
}
