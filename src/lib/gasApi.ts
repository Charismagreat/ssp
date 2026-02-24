/**
 * GAS 웹앱 API로부터 데이터를 가져오고 파싱하는 유틸리티
 */
export async function getTransactionsFromGAS() {
    // 사용자가 GAS에서 배포한 웹앱 URL을 여기에 입력해야 합니다.
    // 예: https://script.google.com/macros/s/AKfycb.../exec
    const GAS_WEBAPP_URL = process.env.NEXT_PUBLIC_GAS_URL || '';

    if (!GAS_WEBAPP_URL) {
        console.error('GAS_WEBAPP_URL이 설정되지 않았습니다.');
        return [];
    }

    try {
        // GAS URL은 리다이렉션이 발생하므로 fetch 옵션 확인
        const response = await fetch(GAS_WEBAPP_URL, {
            next: { revalidate: 3600 },
            method: 'GET'
        });

        if (!response.ok) throw new Error('Failed to fetch GAS data');

        const data = await response.json();

        // 가져온 데이터를 웹페이지 형식에 맞게 포맷팅
        return data.map((item: any, index: number) => ({
            id: index + 1,
            cardCompany: item.cardCompany,
            date: item.date,
            amount: formatAmount(item.amount),
            merchant: item.merchant,
            remarks: item.remarks
        }));
    } catch (error) {
        console.error('Error fetching transactions from GAS:', error);
        return [];
    }
}

function formatAmount(val: any) {
    const num = String(val).replace(/[^0-9.-]+/g, '');
    return `₩${Number(num).toLocaleString()}`;
}
