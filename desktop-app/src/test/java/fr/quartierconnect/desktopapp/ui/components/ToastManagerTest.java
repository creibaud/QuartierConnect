package fr.quartierconnect.desktopapp.ui.components;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ToastManagerTest {

    @Test
    void toastType_successValue_exists() {
        assertNotNull(ToastManager.Type.SUCCESS);
    }

    @Test
    void toastType_errorValue_exists() {
        assertNotNull(ToastManager.Type.ERROR);
    }

    @Test
    void toastType_infoValue_exists() {
        assertNotNull(ToastManager.Type.INFO);
    }

    @Test
    void toastType_enumCount_isThree() {
        assertEquals(3, ToastManager.Type.values().length);
    }
}
