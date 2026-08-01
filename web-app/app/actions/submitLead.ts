'use server'

export async function submitLead(formData: { name: string; city: string; phone: string }) {
    // Ссылка на ваш API в SheetDB (берется из .env.local)
    const SHEETDB_URL = "https://sheetdb.io/api/v1/aot1e9zbsf5bk";

    if (!SHEETDB_URL) {
        console.error('SheetDB URL is missing in environment variables');
        return { success: false };
    }

    try {
        const response = await fetch(SHEETDB_URL, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                data: [
                    {
                        'Name': formData.name,
                        'City': formData.city,
                        'Phone': formData.phone,
                        'Date': new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }),
                    }
                ]
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to send data to SheetDB');
        }

        return { success: true };
    } catch (error) {
        console.error('Error sending lead:', error);
        return { success: false };
    }
}