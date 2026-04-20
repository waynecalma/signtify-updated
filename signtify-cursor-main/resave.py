from ml.model_definition import build_sequence_gru_model
import json

with open('model_labels.json') as f:
    labels = json.load(f)['labels']

model = build_sequence_gru_model(num_classes=len(labels))
model.load_weights('model_weights_only.h5')
print('Success! model_weights_only.h5 loads correctly')