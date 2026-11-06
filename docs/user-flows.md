# LearnTrack — User Workflow Sketch

These diagrams describe the intended user journeys for the project.

## Instructor workflow

```mermaid
flowchart TD
    A([Start]) --> B[Open LearnTrack]
    B --> C[Register or sign in]
    C --> D[Instructor]
    D --> E[Create a course]
    E --> F[Add text lessons]
    F --> G[Create multiple-choice quiz]
    G --> H[Publish learning content]
    H --> I([End])
```

## Student workflow

```mermaid
flowchart TD
    A([Start]) --> B[Open LearnTrack]
    B --> C[Register or sign in]
    C --> D[Student]
    D --> E[Browse available courses]
    E --> F[Select a course]
    F --> G[Enroll in the course]
    G --> H[View course description and details]
    H --> I[Read lessons]
    I --> J[Attempt quiz]
    J --> K[Receive and save calculated score]
    K --> L[Review attempt history]
    L --> M([End])
```
