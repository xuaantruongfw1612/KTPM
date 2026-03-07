const DATA_URL    = "data/data.json";
const CUSTOM_KEY  = "devshortcuts_custom";
const DELETED_KEY = "devshortcuts_deleted";

let allShortcuts     = [];
let isEditMode       = false;
let selectedIds      = [];
let editingShortcutId = null;
