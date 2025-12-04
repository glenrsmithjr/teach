# database/client.py

from sqlalchemy import or_, desc, func
from werkzeug.security import generate_password_hash
from sqlalchemy.inspection import inspect

class SQLiteDatabaseClient:
    """
    A client for interacting with the SQLite database via SQLAlchemy models.
    Provides generic methods for CRUD operations, searching, and filtering.
    """

    def __init__(self, db_session, models):
        """
        Initializes the database client.

        @param db_session: The SQLAlchemy session object (e.g., db.session).
        @param models (dict): A dictionary mapping model names (str) to model classes.
        """
        self.session = db_session
        self.models = models

    def _get_model(self, model_name):
        """
        Retrieves a model class by its name.

        @param model_name (str): The name of the model (e.g., 'User').
        @return: The SQLAlchemy model class.
        @raises ValueError: If the model name is not found.
        """
        model = self.models.get(model_name)
        if not model:
            raise ValueError(f"Model '{model_name}' not found in client configuration.")
        return model

    def create(self, model_name, data):
        """
        Creates a new record in the database.

        @param model_name (str): The name of the model for the new record.
        @param data (dict): A dictionary of data for the new record.
        @return: The newly created model instance.
        """
        try:
            model = self._get_model(model_name)

            # Special handling for password hashing
            if 'password' in data:
                data['password_hash'] = generate_password_hash(data.pop('password'))

            new_record = model(**data)
            self.session.add(new_record)
            self.session.commit()
            return new_record
        except Exception as e:
            self.session.rollback()
            raise e

    def read_by_id(self, model_name, record_id):
        """
        Reads a single record by its primary key.

        @param model_name (str): The name of the model.
        @param record_id: The ID of the record to retrieve.
        @return: The model instance if found, otherwise None.
        """
        Model = self._get_model(model_name)
        return self.session.query(Model).get(record_id)

    def read_all(self, model_name, filters=None, search=None, search_fields=None, order_by=None, page=None,
                 per_page=None):
        Model = self._get_model(model_name)
        query = self.session.query(Model)


        if filters:
            for key, value in filters.items():
                if isinstance(value, (list, tuple)):
                    if not value:
                        query = query.filter(False)  # Return no results for empty list
                    else:
                        query = query.filter(getattr(Model, key).in_(value))
                else:
                    query = query.filter(getattr(Model, key) == value)

        if search and search_fields:
            search_term = f"%{search}%"
            or_clauses = [getattr(Model, field).ilike(search_term) for field in search_fields]
            query = query.filter(or_(*or_clauses))
        if order_by is not None:
            query = query.order_by(order_by)

        return query.all()

    def update(self, model_name, record_id, data):
        """
        Updates an existing record.

        @param model_name (str): The name of the model.
        @param record_id: The ID of the record to update.
        @param data (dict): A dictionary of fields and their new values.
        @return: The updated model instance, or None if not found.
        """
        try:
            record = self.read_by_id(model_name, record_id)
            if not record:
                return None

            for key, value in data.items():
                if hasattr(record, key):
                    setattr(record, key, value)

            self.session.commit()
            return record
        except Exception as e:
            self.session.rollback()
            raise e

    def delete(self, model_name, record_id):
        """
        Deletes a record from the database.

        @param model_name (str): The name of the model.
        @param record_id: The ID of the record to delete.
        @return: True if deletion was successful, False otherwise.
        """
        try:
            record = self.read_by_id(model_name, record_id)
            if record:
                self.session.delete(record)
                self.session.commit()
                return True
            return False
        except Exception as e:
            self.session.rollback()
            raise e

    def count(self, model_name, filters=None, date_filter_col=None, since=None):
        """
        Counts records with optional filters.

        @param model_name (str): The name of the model.
        @param filters (dict, optional): Key-value pairs for exact matching.
        @param date_filter_col (str, optional): The name of the date column to filter on.
        @param since (datetime, optional): The start date for the filter.
        @return (int): The count of matching records.
        """
        Model = self._get_model(model_name)
        query = self.session.query(func.count(Model.id))

        if filters:
            for key, value in filters.items():
                query = query.filter(getattr(Model, key) == value)

        if date_filter_col and since:
            query = query.filter(getattr(Model, date_filter_col) >= since)

        return query.scalar()

    def get_distinct(self, model_name, column_name):
        """
        Gets distinct values for a given column.

        @param model_name (str): The name of the model.
        @param column_name (str): The name of the column.
        @return (list): A list of distinct values.
        """
        Model = self._get_model(model_name)
        results = self.session.query(getattr(Model, column_name)).distinct().all()
        return [result[0] for result in results]

    def get_stats_grouped_by(self, model_name, group_by_column, count_column='id', limit=5):
        """
        Gets statistics grouped by a specific column.

        @param model_name (str): The name of the model.
        @param group_by_column (str): The column to group results by.
        @param count_column (str): The column to count for aggregation.
        @param limit (int): The number of top results to return.
        @return (list): A list of tuples (group_name, count).
        """
        Model = self._get_model(model_name)
        count_label = 'count'

        query = self.session.query(
            getattr(Model, group_by_column),
            func.count(getattr(Model, count_column)).label(count_label)
        ).group_by(getattr(Model, group_by_column)).order_by(desc(count_label)).limit(limit).all()

        return query

    def to_dict(self, model):
        return {
            c.key: getattr(model, c.key)
            for c in inspect(model).mapper.column_attrs
        }