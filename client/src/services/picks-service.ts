import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS, PICKS_BASE_URL } from '@/config/api';
import { ApiResponse, Pick } from '@/types/api';

export const PicksService = {
    async submitPick(userId: number, matchupId: string, eventId: string, fighterId: string): Promise<void> {
        const formData = new FormData();
        formData.append('userId', userId.toString());
        formData.append('matchupId', matchupId);
        formData.append('eventId', eventId);
        formData.append('selectionId', fighterId);

        const response = await fetch(`${PICKS_BASE_URL}/insertPick`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to submit pick');
        }

        return;
    },

    async getPicksForUserAndEvent(userId: number, eventId: string): Promise<Pick[]> {
        const response = await fetch(
            `${PICKS_BASE_URL}/api/v1/getPicksForUserAndEvent?userId=${userId}&eventId=${eventId}`
        );
        
        if (!response.ok) {
            throw new Error('Failed to get picks');
        }
        
        return response.json();
    }
}; 