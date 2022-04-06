import * as mainService from "../services/main.js";
import { extractIdByUrl } from "../utils/index.js";

export async function execute(req, res) {
  const {
    linkSpreadsheetStudents,
    linkSpreadsheetTemplate,
    amountStudents,
    className,
    token,
  } = req.body;

  const idSpreadsheetStudents = extractIdByUrl(linkSpreadsheetStudents);
  const idSpreadsheetTemplate = extractIdByUrl(linkSpreadsheetTemplate);

  await mainService.execute(
    idSpreadsheetStudents,
    idSpreadsheetTemplate,
    amountStudents,
    className,
    token
  );

  return res.sendStatus(200);
}

export async function updateSheet(req, res) {
  const {
    folderLinkSpreadsheet,
    linkSpreadsheetTemplate,
    spreadsheetPageName,
    token,
  } = req.body;

  const folderId = extractIdByUrl(folderLinkSpreadsheet);
  const idSpreadsheetTemplate = extractIdByUrl(linkSpreadsheetTemplate);

  await mainService.executeUpdate(
    folderId,
    idSpreadsheetTemplate,
    spreadsheetPageName,
    token
  );

  return res.sendStatus(200);
}

export async function getStudentsUnderNinetyPercent(req, res) {
  const { linkSpreadsheetStudents, token, endpoint } = req.body;

  try {
    const studentsInfo = await mainService.getStudentsUnderNinetyPercent(
      extractIdByUrl(linkSpreadsheetStudents),
      token,
      endpoint
    );
    res.send(studentsInfo);
  } catch (error) {
    console.error(error);

    if (error.message.includes("READ_ERROR"))
      return res.status(404).send(error.message);

    res.sendStatus(500);
  }
}
