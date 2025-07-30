## The Science of the Fields

## Proposed UI Layout

When [Event|Attribute] [Field] [Operator] [Value] [at least X times in the last Y days]

## Visual Layout

[Event | Attribute] [Field Dropdown] [Operator Dropdown] [Value Input]  
(if Event) [Frequency Operator] [Frequency Count] [Frequency Period]
(Delete button at end)

## Breakdown

1. Type → What are we filtering?

   Event (e.g., Page Entered, Purchase Completed)

   Attribute (e.g., Country, App Version, OS)

2. Field (Type-Value) → Which event or attribute?

   Event → Pick from list of tracked events.

   Attribute → Pick from user profile attributes.

3. Operator → Logical operator based on type:

   Event operators: “is”, “is not”, “contains”, “starts with”.

   Attribute operators: “equals”, “not equals”, “greater than”, etc.

4. Value → Value(s) to compare against.

   Event → Maybe string (page name), maybe multiple.

   Attribute → Could be text, number, or a select list.

5. Frequency (Optional) → Applies only to events, not attributes.

   Example: "at least X times in the last Y days".
