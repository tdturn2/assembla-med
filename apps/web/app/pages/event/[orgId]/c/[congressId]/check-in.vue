<script setup lang="ts">
import type { AppointmentPublic, CheckInPublic } from '@assembla-med/shared'
import { formatInTimeZone, resolveTimeZone } from '@assembla-med/shared'

const route = useRoute()
const orgId = route.params.orgId as string
const congressId = route.params.congressId as string

definePageMeta({
  layout: 'event',
  title: 'Check-in'
})

const { api } = useApi()
const toast = useToast()

const code = ref('')
const found = ref<AppointmentPublic | null>(null)
const checkIn = ref<CheckInPublic | null>(null)
const error = ref('')
const pending = ref(false)
const canvasRef = ref<HTMLCanvasElement | null>(null)
let drawing = false

const form = reactive({
  attendeeName: '',
  attendeeEmail: '',
  notes: '',
  tovAmount: '',
  tovType: 'meal'
})

async function lookup() {
  error.value = ''
  found.value = null
  checkIn.value = null
  try {
    const result = await api<{ appointment: AppointmentPublic }>(
      `/organizations/${orgId}/appointments/by-code/${code.value.trim().toUpperCase()}`
    )
    if (result.appointment.congressId !== congressId) {
      error.value = 'That code belongs to a different congress'
      return
    }
    found.value = result.appointment
    form.attendeeName = result.appointment.kol?.name || ''
    form.attendeeEmail = result.appointment.kol?.email || ''
    await nextTick()
    setupCanvas()
  } catch (e: unknown) {
    error.value = (e as { data?: { message?: string } })?.data?.message
      || 'Appointment not found'
  }
}

function setupCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.strokeStyle = '#111111'
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
}

function pointerPos(event: PointerEvent) {
  const canvas = canvasRef.value!
  const rect = canvas.getBoundingClientRect()
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height)
  }
}

function onPointerDown(event: PointerEvent) {
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return
  drawing = true
  canvas.setPointerCapture(event.pointerId)
  const { x, y } = pointerPos(event)
  ctx.beginPath()
  ctx.moveTo(x, y)
}

function onPointerMove(event: PointerEvent) {
  if (!drawing) return
  const ctx = canvasRef.value?.getContext('2d')
  if (!ctx) return
  const { x, y } = pointerPos(event)
  ctx.lineTo(x, y)
  ctx.stroke()
}

function onPointerUp() {
  drawing = false
}

function clearSignature() {
  setupCanvas()
}

async function submitCheckIn() {
  if (!found.value) return
  error.value = ''
  pending.value = true
  try {
    const signatureBase64 = canvasRef.value?.toDataURL('image/png')
    const result = await api<{ checkIn: CheckInPublic }>(
      `/organizations/${orgId}/check-ins`,
      {
        method: 'POST',
        body: {
          checkInCode: found.value.checkInCode,
          attendeeName: form.attendeeName || undefined,
          attendeeEmail: form.attendeeEmail || undefined,
          notes: form.notes || undefined,
          tovAmount: form.tovAmount ? Number(form.tovAmount) : undefined,
          tovType: form.tovType || undefined,
          signatureBase64
        }
      }
    )
    checkIn.value = result.checkIn
    toast.add({ title: 'Check-in saved', color: 'success' })
  } catch (e: unknown) {
    error.value = (e as { data?: { message?: string } })?.data?.message
      || 'Check-in failed'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-xl font-semibold text-highlighted tracking-tight">
        Check-in
      </h1>
      <p class="mt-1 text-sm text-muted">
        Same API as Console — look up by code, capture ToV + signature.
      </p>
    </div>

    <div class="rounded-lg border border-default bg-default p-3 space-y-3">
      <UFormField label="Check-in code">
        <div class="flex gap-2">
          <UInput
            v-model="code"
            class="flex-1 font-mono uppercase"
            placeholder="ABCD1234"
            @keyup.enter="lookup"
          />
          <UButton @click="lookup">
            Look up
          </UButton>
        </div>
      </UFormField>
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      :title="String(error)"
    />

    <div
      v-if="found"
      class="rounded-lg border border-default bg-default p-3 space-y-3"
    >
      <div>
        <p class="font-medium text-highlighted">
          {{ found.title }}
        </p>
        <p class="text-xs text-muted">
          <span v-if="found.kol">{{ found.kol.name }} · </span>
          {{ found.engagementType.replace('_', ' ') }}
          <span v-if="found.isContracted"> · contracted</span>
        </p>
        <p class="text-xs text-muted mt-1">
          Scheduled
          {{ formatInTimeZone(found.startTime, resolveTimeZone(found.congress?.timezone)) }}
          –
          {{ formatInTimeZone(found.endTime, resolveTimeZone(found.congress?.timezone)) }}
          <span> · {{ resolveTimeZone(found.congress?.timezone) }}</span>
          <span v-if="found.room"> · {{ found.room.title }}</span>
          <span v-else-if="found.location"> · {{ found.location }}</span>
        </p>
      </div>

      <UFormField label="Attendee name">
        <UInput
          v-model="form.attendeeName"
          class="w-full"
        />
      </UFormField>
      <UFormField label="ToV amount">
        <UInput
          v-model="form.tovAmount"
          type="number"
          step="0.01"
          class="w-full"
        />
      </UFormField>
      <UFormField label="Notes">
        <UTextarea
          v-model="form.notes"
          class="w-full"
          :rows="2"
        />
      </UFormField>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-highlighted">
            Signature
          </p>
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            @click="clearSignature"
          >
            Clear
          </UButton>
        </div>
        <canvas
          ref="canvasRef"
          width="640"
          height="200"
          class="w-full rounded-md border border-default bg-white touch-none"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointerleave="onPointerUp"
        />
      </div>

      <UButton
        block
        :loading="pending"
        @click="submitCheckIn"
      >
        Save check-in
      </UButton>

      <UAlert
        v-if="checkIn"
        color="success"
        variant="subtle"
        title="Check-in recorded"
        :description="`Signature: ${checkIn.signatureStatus}`"
      />
    </div>
  </div>
</template>
