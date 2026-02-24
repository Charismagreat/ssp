/**
 * 구글 앱스 스크립트 (GAS)용 doGet 함수
 * 스프레드시트의 데이터를 JSON 형식으로 반환하여 외부에서 API처럼 사용할 수 있게 합니다.
 */
function doGet(e) {
    try {
        const SPREADSHEET_ID = '12y8j12kFcSyUFYod2NNdXxTyg1iball_aDMeS-sZTzU';
        const SHEET_NAME = '승인내역';

        const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
        const sheet = spreadsheet.getSheetByName(SHEET_NAME);
        const data = sheet.getDataRange().getValues();

        if (data.length < 2) {
            return ContentService.createTextOutput(JSON.stringify([]))
                .setMimeType(ContentService.MimeType.JSON);
        }

        const headers = data[0];
        const rows = data.slice(1);

        // 헤더 인덱스 매핑
        const idxMap = {
            cardCompany: headers.indexOf('카드사'),
            date: headers.indexOf('접수일자/(승인일자)'),
            amount: headers.indexOf('이용금액'),
            merchant: headers.indexOf('가맹점명/국가명(도시명)'),
            remarks: headers.indexOf('메모')
        };

        const result = rows.map(row => {
            // 날짜 포맷팅 (날짜 객체인 경우 처리)
            let dateValue = row[idxMap.date];
            if (dateValue instanceof Date) {
                dateValue = Utilities.formatDate(dateValue, Session.getScriptTimeZone(), "yyyy-MM-dd");
            }

            return {
                cardCompany: String(row[idxMap.cardCompany] || ""),
                date: String(dateValue || ""),
                amount: String(row[idxMap.amount] || "0"),
                merchant: String(row[idxMap.merchant] || ""),
                remarks: String(row[idxMap.remarks] || "")
            };
        }).filter(item => item.date !== ""); // 빈 행 제외

        return ContentService.createTextOutput(JSON.stringify(result))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}
