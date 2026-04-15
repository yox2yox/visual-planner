import { writable } from 'svelte/store'

export const selectedGlossaryId = writable<string | null>(null)
