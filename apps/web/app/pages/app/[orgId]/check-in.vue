<script setup lang="ts">
import type { AppointmentPublic, CheckInPublic } from '@assembla-med/shared'

const route = useRoute()
const orgId = route.params.orgId as string
const config = useRuntimeConfig()

definePageMeta({
  layout: 'console',
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
  tovType: 'meal',
  captureSignature: true
})

async function lookup() {
  error.value = ''
  found.value = null
  checkIn.value = null
  try {
    const result = await api<{ appointment: AppointmentPublic }>(
      `/organizations/${orgId}/appointments/by-code/${code.value.trim().toUpperCase()}`
    )
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
    let signatureBase64: string | undefined
    if (form.captureSignature && canvasRef.value) {
      signatureBase64 = canvasRef.value.toDataURL('image/png')
    }
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

async function voidAndNote() {
  if (!checkIn.value) return
  const reason = window.prompt('Void reason')
  if (!reason) return
  await api(`/organizations/${orgId}/check-ins/${checkIn.value.id}/void`, {
    method: 'POST',
    body: { reason }
  })
  toast.add({
    title: 'Check-in voided',
    description: 'Create a replacement check-in with corrected details.',
    color: 'warning'
  })
  checkIn.value = null
}

const replaying = ref(false)

async function replayIntegration(forceFail = false) {
  if (!checkIn.value) return
  replaying.value = true
  error.value = ''
  try {
    const result = await api<{ checkIn: CheckInPublic }>(
      `/organizations/${orgId}/check-ins/${checkIn.value.id}/integration/replay`,
      { method: 'POST', body: { forceFail } }
    )
    checkIn.value = result.checkIn
    toast.add({
      title: forceFail ? 'Simulated failure recorded' : 'Push replayed',
      color: result.checkIn.integrationStatus === 'pushed' ? 'success' : 'warning'
    })
  } catch (e: unknown) {
    error.value = (e as { data?: { message?: string } })?.data?.message || 'Replay failed'
  } finally {
    replaying.value = false
  }
}

function integrationLabel(status: CheckInPublic['integrationStatus'], destination: CheckInPublic['integrationDestination']) {
  const dest = destination === 'mock' ? 'Simulated destination (CVENT sandbox pending)' : 'CVENT'
  if (status === 'pushed') return `${dest} · pushed`
  if (status === 'failed') return `${dest} · failed`
  if (status === 'skipped') return `${dest} · skipped`
  return `${dest} · pending`
}

const apiBase = computed(() => config.public.apiBase as string)
</script>

<template>
  <div class="space-y-8 max-w-2xl">
    <div>
      <h1 class="text-2xl font-semibold text-highlighted tracking-tight">
        Check-in
      </h1>
      <p class="mt-1 text-sm text-muted">
        Look up by appointment code, capture ToV and signature.
      </p>
    </div>

    <div class="rounded-lg border border-default bg-default p-4 space-y-3">
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
      class="rounded-lg border border-default bg-default p-4 space-y-4"
    >
      <div>
        <p class="font-medium text-highlighted">
          {{ found.title }}
        </p>
        <p class="text-sm text-muted">
          {{ found.congress?.name }}
          <span v-if="found.kol"> · {{ found.kol.name }}</span>
        </p>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <UFormField label="Attendee name">
          <UInput
            v-model="form.attendeeName"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Attendee email">
          <UInput
            v-model="form.attendeeEmail"
            type="email"
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
        <UFormField label="ToV type">
          <UInput
            v-model="form.tovType"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Notes"
          class="sm:col-span-2"
        >
          <UTextarea
            v-model="form.notes"
            class="w-full"
          />
        </UFormField>
      </div>

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

      <div class="flex flex-wrap gap-2">
        <UButton
          :loading="pending"
          @click="submitCheckIn"
        >
          Save check-in
        </UButton>
        <UButton
          v-if="checkIn"
          color="neutral"
          variant="outline"
          @click="voidAndNote"
        >
          Void check-in
        </UButton>
        <UButton
          v-if="checkIn"
          color="neutral"
          variant="soft"
          :loading="replaying"
          @click="replayIntegration(false)"
        >
          Replay push
        </UButton>
        <UButton
          v-if="checkIn"
          color="neutral"
          variant="ghost"
          :loading="replaying"
          @click="replayIntegration(true)"
        >
          Demo force-fail
        </UButton>
      </div>

      <UAlert
        v-if="checkIn"
        :color="checkIn.integrationStatus === 'pushed' ? 'success' : checkIn.integrationStatus === 'failed' ? 'warning' : 'neutral'"
        variant="subtle"
        title="Check-in recorded"
        :description="[
          `Signature: ${checkIn.signatureStatus}`,
          integrationLabel(checkIn.integrationStatus, checkIn.integrationDestination),
          checkIn.integrationExternalId ? `External id: ${checkIn.integrationExternalId}` : null,
          checkIn.integrationLastError ? `Error: ${checkIn.integrationLastError}` : null,
          `Attempts: ${checkIn.integrationAttemptCount}`
        ].filter(Boolean).join(' · ')"
      />
    </div>

    <p class="text-xs text-muted">
      API: {{ apiBase }}
    </p>
  </div>
</template>
