<script setup lang="ts">
    // RoomModal.vue
    import { ref, computed } from 'vue';
    import { createRoom, updateRoom } from '../services/roomService';
    import type { Room } from '../types/Room';

    // Get our emits -- outcomes of the modal
    const emit = defineEmits(["close", "finished"])

    // Allow Props -- Value(s) passed in from RoomsView.vue
    const props = defineProps<{
        roomData: Room | null
    }>()

    // Are we editing a room or creating a new one?
    const isEditing = computed(() => !!props.roomData) // If roomData is NOT null (therefor its a Room object) then we are editing.

    // Get the room we're editing / creating and set its default values.
    const room = ref<Room>(
        props.roomData 
        ? {
            id: props.roomData.id,
            schoolId: props.roomData.schoolId,
            name: props.roomData.name,
            nameNormalised: props.roomData.nameNormalised,
            isBookable: props.roomData.isBookable,
            createdBy: props.roomData.createdBy,
            createdAt: props.roomData.createdAt,
            rules: props.roomData.rules
        } as Room// If there is roomData, clone it to edit it in the tables w/o editing it in the database yet
        : { // If there is no roomData, use a default room
        id:"",
        schoolId:"",
        name:"",
        nameNormalised:"",
        isBookable:false,
        createdBy:"",
        createdAt:"",
        rules: {
            maxBookingHours:0,
            requiresApproval:true,
            allowedDays:[],
            openHour:0,
            closeHour:0,
            allowedYearLevels:[],
            agreement:""
        }
    } as Room)

    // Submit room creation / edit
    async function submitRoom() {
        // Try to submit the room
        try {
            // Run room creation service
            if (isEditing.value) await updateRoom(room.value)
            else await createRoom(room.value)
        } catch (err:any) {
            err.value = err.message
            console.log(err.value)
        } finally {
            // Emit created
            emit("finished")

            // Close the modal
            closeModal()
        }
    }
    function closeModal() {
        emit("close")
    }

    // Define days for the checkbox list 
    const days = [
        {label:"Monday", value:1},
        {label:"Tuesday", value:2},
        {label:"Wednesday", value:3},
        {label:"Thursday", value:4},
        {label:"Friday", value:5},
        {label:"Saturday", value:6},
        {label:"Sunday", value:0}
    ]

    // Define yearlevels for checkbox list 
    const yearLevels = [
        {label:"Year 7", value:7},
        {label:"Year 8", value:8},
        {label:"Year 9", value:9},
        {label:"Year 10", value:10},
        {label:"Year 11", value:11},
        {label:"Year 12", value:12}
    ]
</script>

<template>
    <div class="modal-backdrop-custom">
        <div class="modal-dialog-custom" role="dialog" aria-modal="true" aria-labelledby="room-modal-title">
            <div class="card p-4 modal-card">
                <!-- Header -->
                 <h4 id="room-modal-title">Create/Edit Room</h4>

                 <!-- Room Create / Edit Form -->
                  <!-- Get the Room's Name -->
                   <div class="row align-items-center mb-3">
                        <label for="roomname" class=" col-sm-4 col-form-label">Room Name: </label>
                        <div class="col-sm-8">
                            <input id="roomname" v-model="room.name" class="form-control"/>
                        </div>
                   </div>

                   <!-- Toggle Whether or Not This Room should be Bookable -->
                   <div class="row align-items-center mb-3">
                        <label for="isbookable" class="col-sm-4 form-check-label">Is Room Bookable? </label>
                        <div class="col-sm-8">
                            <div class="form-check">
                                <input id="isbookable" type="checkbox" v-model="room.isBookable" class="form-check-input" required/>
                            </div>
                        </div>
                   </div>

                   <!-- Max booking hours -->
                   <div class="row align-items-center mb-3">
                        <label for="maxhours" class="col-sm-4 form-label">Max Session Length (Hours): </label>
                        <div class="col-sm-8">
                            <input type="number" id="maxhours" v-model="room.rules.maxBookingHours" class="form-control" min="0" max="24" required/>
                        </div>
                   </div>

                   <!-- Does this room ALWAYS require approval? -->
                   <div class="row align-items-center mb-3">
                        <label for="reqapproval" class="col-sm-4 form-check-label">Bookings ALWAYS Require Approval? </label>
                        <div class="col-sm-8">
                            <div class="form-check">
                                <input id="reqapproval" type="checkbox" v-model="room.rules.requiresApproval" class="form-check-input me-2" required/>
                            </div>
                        </div>
                   </div>

                   <!-- Allowed Days-->
                    <div class="row align-items-center mb-3">
                        <label class="col-sm-4 form-label">Allowed Days:</label>
                        <div class="col-sm-8 d-flex flex-wrap gap-3">
                            <div v-for="day in days" :key="day.value" class="form-check">
                                <input class="form-check-input" type="checkbox" :id="`day-${day.value}`" :value="day.value" v-model="room.rules.allowedDays"/>
                                <label class="form-check-label" :for="`day-${day.value}`">{{day.label}}</label>
                            </div>
                        </div>
                    </div>

                    <!-- Opening Hour -->
                   <div class="row align-items-center mb-3">
                        <label for="openhour" class="col-sm-4 form-label">Opening Hour (0-23): </label>
                        <div class="col-sm-8">
                            <input type="number" id="openhour" v-model="room.rules.openHour" class="form-control" min="0" max="23" required/>
                        </div>
                   </div>

                   <!-- Closing Hour -->
                   <div class="row align-items-center mb-3">
                        <label for="closehour" class="col-sm-4 form-label">Closing Hour (0-23): </label>
                        <div class="col-sm-8">
                            <input type="number" id="closehour" v-model="room.rules.closeHour" class="form-control" :min="room.rules.openHour" max="23" required/>
                        </div>
                   </div>

                   <!-- Allowed Year Levels -->
                   <div class="row align-items-center mb-3">
                        <label class="col-sm-4 form-label">Allowed Year Levels:</label>
                        <div class="col-sm-8 d-flex flex-wrap gap-3">
                            <div v-for="yl in yearLevels" :key="yl.value" class="form-check">
                                <input class="form-check-input" type="checkbox" :id="`yl-${yl.value}`" :value="yl.value" v-model="room.rules.allowedYearLevels"/>
                                <label class="form-check-label" :for="`yl-${yl.value}`">{{ yl.label }}</label>
                            </div>
                        </div>
                   </div>

                   <!-- Agreement for Bookers to Sign -->
                    <div class="row align-items-center mb-3">
                        <label class="col-sm-4 form-label" for="agreement">Room Agreement:</label>
                        <div class="col-sm-8">
                            <textarea
                                id="agreement"
                                v-model="room.rules.agreement"
                                class="form-control form-textarea-resizable"
                                rows="6"
                                placeholder="Enter room usage agreement. Must be agreed to to book this room."
                                maxlength="2000"></textarea>
                                <small class="text-muted">
                                    {{ room.rules.agreement.length }}/2000 characters
                                </small>
                        </div>
                    </div>

                   <!-- End of Form, Button Section -->
                    <div class="d-flex justify-content-end gap-2">
                        <button class="btn btn-secondary" @click="$emit('close')">
                            Cancel
                        </button>
                        <button class="btn btn-primary" @click="submitRoom">
                            Submit
                        </button>
                    </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.modal-backdrop-custom {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);

    display: flex;
    justify-content: center;
    align-items: center;

    z-index: 1000;
}

.modal-dialog-custom {
    width: 500px;
    max-width: 90%;
}
</style>

