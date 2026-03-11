/**
 * Google Spreadsheet 데이터를 가져오고 파싱하는 유틸리티
 */
export async function getTransactionsFromSheet() {
    const SPREADSHEET_ID = '1LcEGIM-3xfQPPIazyj1VNQQfxNShsK3toJkmUXCVYcg';//
    const SHEET_NAME = encodeURIComponent('승인내역');

    // CSV 형태로 내보내기 URL (시트가 '링크가 있는 모든 사용자에게 공개'되어 있어야 합니다)
    const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}`;

    try {
        const response = await fetch(url, { next: { revalidate: 60 } }); // 1분 캐싱 (기존 1시간에서 단축)
        if (!response.ok) throw new Error('Failed to fetch spreadsheet data');

        const csvData = await response.text();
        return parseCSV(csvData);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return [];
    }
}

/**
 * 단순 CSV 파서 (헤더 매칭 포함)
 */
function parseCSV(csv: string) {
    const lines = csv.split('\n');
    if (lines.length < 2) return [];

    // CSV의 각 라인에서 따옴표로 묶인 콤마를 고려한 정교한 분리
    const parseLine = (line: string) => {
        const result = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(cur.replace(/^"|"$/g, '').trim());
                cur = '';
            } else {
                cur += char;
            }
        }
        result.push(cur.replace(/^"|"$/g, '').trim());
        return result;
    };

    const headers = parseLine(lines[0]);

    // 헤더 인덱스 찾기
    const idxMap = {
        cardCompany: headers.indexOf('카드사'),
        date: headers.indexOf('접수일자/(승인일자)'),
        amount: headers.indexOf('이용금액'),
        merchant: headers.indexOf('가맹점명/국가명(도시명)'),
        remarks: headers.indexOf('메모')
    };

    return lines.slice(1).map((line, i) => {
        const values = parseLine(line);
        return {
            id: i + 1,
            cardCompany: values[idxMap.cardCompany] || '',
            date: values[idxMap.date] || '',
            amount: formatAmount(values[idxMap.amount]),
            merchant: values[idxMap.merchant] || '',
            remarks: values[idxMap.remarks] || ''
        };
    }).filter(item => item.date !== ''); // 날짜가 없는 빈 행 제외
}

function formatAmount(val: string) {
    if (!val) return '₩0';
    // 숫자만 추출
    const num = val.replace(/[^0-9.-]+/g, '');
    return `₩${Number(num).toLocaleString()}`;
}
