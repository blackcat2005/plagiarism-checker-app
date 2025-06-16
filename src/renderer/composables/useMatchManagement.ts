import { ref, computed } from 'vue'
import { MatchSentenceUI, ReasonType } from '@/shared/types'

export function useMatchManagement() {
  const showDeleteDialog = ref(false)
  const selectedMatch = ref<MatchSentenceUI>()
  const reasonType = ref<ReasonType>()
  const reasonText = ref('')

  const handleDeleteMatch = (match: MatchSentenceUI) => {
    console.log('Deleting match:', match)
    selectedMatch.value = match
    showDeleteDialog.value = true
  }

  const handleRestoreMatch = (match: MatchSentenceUI) => {
    if (match) {
      match.isDeleted = false
      match.reasonType = undefined
      match.reasonText = ''
      reasonType.value = undefined
      reasonText.value = ''
      console.log('Match restored:', match)
    }
  }

  const handleEditMatch = (match: MatchSentenceUI) => {
    console.log('Editing match:', match)
    selectedMatch.value = match
    reasonType.value = match.reasonType
    reasonText.value = match.reasonText || ''
    showDeleteDialog.value = true
  }

  const saveDeleteReason = () => {
    if (selectedMatch.value) {
      selectedMatch.value.isDeleted = true
      selectedMatch.value.reasonType = reasonType.value
      selectedMatch.value.reasonText = reasonText.value
    }
    showDeleteDialog.value = false
    reasonText.value = ''
  }

  return {
    showDeleteDialog,
    selectedMatch,
    reasonType,
    reasonText,
    handleDeleteMatch,
    handleEditMatch,
    handleRestoreMatch,
    saveDeleteReason
  }
}
