/**
 * Scheduler simple para eventos periódicos
 */
export class Scheduler {
    constructor() {
        this.tasks = [];
        this.lastCheck = Date.now();
    }

    /**
     * Agrega una tarea recurrente
     * @param {string} name - Nombre de la tarea
     * @param {number} intervalMinutes - Intervalo en minutos
     * @param {Function} callback - Función a ejecutar
     */
    addTask(name, intervalMinutes, callback) {
        this.tasks.push({
            name,
            interval: intervalMinutes * 60 * 1000,
            callback,
            lastRun: Date.now()
        });
    }

    check(now) {
        const timestamp = now.getTime();
        this.tasks.forEach(task => {
            if (timestamp - task.lastRun >= task.interval) {
                console.log(`[Scheduler] Ejecutando tarea: ${task.name}`);
                task.callback();
                task.lastRun = timestamp;
            }
        });
    }

    clearTasks() {
        this.tasks = [];
        console.log('[Scheduler] Tareas limpiadas.');
    }
}

export const scheduler = new Scheduler();
