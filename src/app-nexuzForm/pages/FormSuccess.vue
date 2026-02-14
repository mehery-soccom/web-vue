<template>
	<VContainer>
		<VRow class="justify-center mt-12">
			<VCol cols="12" md="7">
				<VCard class="text-center pa-10" elevation="2">
					<VIcon size="80" color="success" class="mb-6">
						mdi-check-circle
					</VIcon>

					<h2
						class="text-h4 font-weight-medium text-success mb-4"
						style="line-height: 1.4"
					>
						Form submitted successfully!
					</h2>

					<p
						class="text-h6 font-weight-regular text-medium-emphasis"
						style="line-height: 1.6"
					>
						Thank you! The form has been submitted successfully.
						<br />
						We will reply to you soon!
					</p>
				</VCard>
			</VCol>
		</VRow>
	</VContainer>
</template>

<script setup>
// This component doesn't need any script logic
</script>